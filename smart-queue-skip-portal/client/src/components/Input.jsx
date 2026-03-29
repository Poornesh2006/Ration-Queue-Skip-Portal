const Input = ({ label, className = "", inputClassName = "", ...props }) => (
  <label className={`ui-input-group ${className}`.trim()}>
    {label && <span>{label}</span>}
    <input className={`ui-input ${inputClassName}`.trim()} {...props} />
  </label>
);

export default Input;
