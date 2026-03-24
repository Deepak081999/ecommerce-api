const { z } = require('zod');

const productSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().min(0, 'Price cannot be negative'),
    category: z.string().min(2, 'Category is required'),
    stock: z.number().min(0).default(0),
    images: z.array(z.string()).optional(),
});

const reviewSchema = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().min(2, 'Comment is required'),
});

module.exports = { productSchema, reviewSchema };