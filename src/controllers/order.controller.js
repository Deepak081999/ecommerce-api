const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { createOrderSchema, updateStatusSchema } = require('../validators/order.validator');

// @POST /api/orders — Customer
const createOrder = async (req, res, next) => {
    try {
        const parsed = createOrderSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const { items, shippingAddress, paymentMethod } = parsed.data;

        // Fetch products and validate stock
        const orderItems = [];
        let itemsPrice = 0;

        for (const item of items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.product}` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
                });
            }

            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.images?.[0] || '',
            });

            itemsPrice += product.price * item.quantity;

            // Reduce stock
            product.stock -= item.quantity;
            await product.save();
        }

        const taxPrice = parseFloat((itemsPrice * 0.18).toFixed(2)); // 18% GST
        const shippingPrice = itemsPrice > 500 ? 0 : 50;             // Free above ₹500
        const totalPrice = parseFloat((itemsPrice + taxPrice + shippingPrice).toFixed(2));

        const order = await Order.create({
            user: req.user.id,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
        });

        res.status(201).json({ message: 'Order placed successfully', order });
    } catch (error) {
        next(error);
    }
};

// @GET /api/orders — Admin gets all, Customer gets own
const getOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = req.user.role === 'admin' ? {} : { user: req.user.id };

        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .populate('user', 'name email')
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({ total, page, totalPages: Math.ceil(total / limit), orders });
    } catch (error) {
        next(error);
    }
};

// @GET /api/orders/:id — Get single order
const getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.product', 'name images');

        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Customer can only see their own order
        if (req.user.role !== 'admin' && order.user._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.status(200).json({ order });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/orders/:id/status — Admin only
const updateOrderStatus = async (req, res, next) => {
    try {
        const parsed = updateStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = parsed.data.status;

        if (parsed.data.status === 'delivered') {
            order.isDelivered = true;
            order.deliveredAt = Date.now();
        }

        if (parsed.data.status === 'cancelled') {
            // Restore stock on cancellation
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }
        }

        await order.save();
        res.status(200).json({ message: 'Order status updated', order });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/orders/:id — Customer cancel own pending order
const cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending orders can be cancelled' });
        }

        order.status = 'cancelled';

        // Restore stock
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }

        await order.save();
        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        next(error);
    }
};

module.exports = { createOrder, getOrders, getOrder, updateOrderStatus, cancelOrder };