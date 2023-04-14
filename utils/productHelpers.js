exports.getDiscountedPrice = (product, toStripe = false) => {
    let { discount = 0, price } = product;
    if (!(discount || discount === undefined) || !price) return -1;
    if (typeof discount !== 'number') discount = 0;
    const discounted = price * (1 - discount / 100);

    return toStripe ? discounted * 100 : discount;
}