const frontendUrl = process.env.NODE_ENV === 'production' ? 'https://vue-ecommerce-frontend-ionut-frisan.vercel.app' : 'http://localhost:5173/';

exports.config = {
    frontendUrl,
}