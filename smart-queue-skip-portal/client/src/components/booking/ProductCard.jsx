import QuantitySelector from "./QuantitySelector";

const ProductCard = ({
  product,
  availableStock,
  quantity,
  maxQuantity,
  onQuantityChange,
}) => (
  <article className="product-card animated-slide-up">
    <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
    <div className="card-heading">
      <h3>{product.name}</h3>
      <span className="stock-chip">{availableStock} in stock</span>
    </div>
    <p>{product.description}</p>
    <p className="entitlement-line">Allowed quantity: {maxQuantity}</p>
    <QuantitySelector
      quantity={quantity}
      onDecrease={() => onQuantityChange(quantity - 1)}
      onIncrease={() => onQuantityChange(quantity + 1)}
      disableDecrease={quantity <= 0}
      disableIncrease={quantity >= maxQuantity || maxQuantity <= 0}
    />
  </article>
);

export default ProductCard;
