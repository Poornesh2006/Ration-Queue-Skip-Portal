import { motion } from "framer-motion";
import Button from "./Button";
import EmptyState from "./EmptyState";
import Skeleton from "./Skeleton";

export const ProductTableSkeleton = ({ rows = 5 }) => (
  <div className="table-shell">
    <table className="admin-table">
      <thead>
        <tr>
          <th>Image</th>
          <th>Name</th>
          <th>Type</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, index) => (
          <tr key={`skeleton-row-${index}`}>
            <td data-label="Image"><Skeleton className="table-skeleton-media" rounded /></td>
            <td data-label="Name">
              <Skeleton className="table-skeleton-title" />
              <Skeleton className="table-skeleton-subtitle" />
            </td>
            <td data-label="Type"><Skeleton className="table-skeleton-chip" rounded /></td>
            <td data-label="Price"><Skeleton className="table-skeleton-value" /></td>
            <td data-label="Stock"><Skeleton className="table-skeleton-value" /></td>
            <td data-label="Actions">
              <div className="table-actions">
                <Skeleton className="table-skeleton-action" rounded />
                <Skeleton className="table-skeleton-action" rounded />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProductTable = ({ products, onEdit, onDelete }) => (
  <div className="table-shell">
    {!products.length ? (
      <EmptyState
        title="No data available"
        description="Products will appear here once inventory is added."
        icon="box"
      />
    ) : (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Image</th>
          <th>Name</th>
          <th>Type</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <motion.tr
            key={product._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <td data-label="Image">
              <div className="product-table-media">
                <img
                  src="/images/products/rice.png"
                  alt={product.name}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = "/images/misc/TamilNadu_Logo.svg.png";
                  }}
                />
              </div>
            </td>
            <td data-label="Name">
              <strong>{product.name}</strong>
              <span>{product.sku}</span>
            </td>
            <td data-label="Type">
              <span className={`type-badge ${product.type}`}>{product.type}</span>
            </td>
            <td data-label="Price">Rs {Number(product.price || 0).toFixed(2)}</td>
            <td data-label="Stock">
              {product.stockAvailable} {product.unit}
            </td>
            <td data-label="Actions">
              <div className="table-actions">
                <Button variant="ghost" type="button" className="table-action edit-action" onClick={() => onEdit(product)}>
                  Edit
                </Button>
                <Button variant="ghost" type="button" className="table-action delete-action" onClick={() => onDelete(product._id)}>
                  Delete
                </Button>
              </div>
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
    )}
  </div>
);

export default ProductTable;
