const { z } = require('zod');

const orderItemSchema = z.object({
    product: z.string().min(1, 'Product ID is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const shippingSchema = z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(1),
});

const createOrderSchema = z.object({
    items: z.array(orderItemSchema).min(1, 'At least one item required'),
    shippingAddress: shippingSchema,
    paymentMethod: z.enum(['cod', 'card', 'upi']).default('cod'),
});

const updateStatusSchema = z.object({
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

module.exports = { createOrderSchema, updateStatusSchema };