const QuantitySelector = ({
  quantity,
  onDecrease,
  onIncrease,
  disableDecrease = false,
  disableIncrease = false,
}) => (
  <div className="quantity-control">
    <button
      type="button"
      className="qty-button"
      onClick={onDecrease}
      disabled={disableDecrease}
      aria-label="Decrease quantity"
    >
      -
    </button>
    <div className="qty-value">
      <span>Qty</span>
      <strong>{quantity}</strong>
    </div>
    <button
      type="button"
      className="qty-button"
      onClick={onIncrease}
      disabled={disableIncrease}
      aria-label="Increase quantity"
    >
      +
    </button>
  </div>
);

export default QuantitySelector;
