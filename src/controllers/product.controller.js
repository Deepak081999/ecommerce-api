const Product = require('../models/product.model');
const { productSchema, reviewSchema } = require('../validators/product.validator');

// @POST /api/products — Admin only
const createProduct = async (req, res, next) => {
    try {
        const parsed = productSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const product = await Product.create({
            ...parsed.data,
            createdBy: req.user.id,
        });

        res.status(201).json({ message: 'Product created', product });
    } catch (error) {
        next(error);
    }
};

// @GET /api/products — Public
const getProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            order = 'desc',
            search,
        } = req.query;

        // Build filter object
        const filter = {};

        if (category) filter.category = category.toLowerCase();

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        // Sorting
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = { [sortBy]: sortOrder };

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const total = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        res.status(200).json({
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            count: products.length,
            products,
        });
    } catch (error) {
        next(error);
    }
};

// @GET /api/products/:id — Public
const getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ product });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/products/:id — Admin only
const updateProduct = async (req, res, next) => {
    try {
        const parsed = productSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            parsed.data,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product updated', product });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/products/:id — Admin only
const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @POST /api/products/:id/reviews — Customer only
const addReview = async (req, res, next) => {
    try {
        const parsed = reviewSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user already reviewed
        const alreadyReviewed = product.reviews.find(
            r => r.user.toString() === req.user.id
        );
        if (alreadyReviewed) {
            return res.status(400).json({ message: 'Product already reviewed' });
        }

        const review = {
            user: req.user.id,
            name: req.user.name,
            rating: parsed.data.rating,
            comment: parsed.data.comment,
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.averageRating =
            product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;

        await product.save();

        res.status(201).json({ message: 'Review added' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    addReview,
};