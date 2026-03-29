import Button from "./Button";

const FilterBar = ({
  searchValue,
  onSearchChange,
  typeValue,
  onTypeChange,
  onReset,
}) => (
  <div className="filter-bar">
    <input
      className="ui-input"
      placeholder="Search products"
      value={searchValue}
      onChange={onSearchChange}
    />
    <select className="ui-input" value={typeValue} onChange={onTypeChange}>
      <option value="">All types</option>
      <option value="free">Free</option>
      <option value="paid">Paid</option>
    </select>
    <Button variant="ghost" type="button" onClick={onReset}>
      Reset
    </Button>
  </div>
);

export default FilterBar;
