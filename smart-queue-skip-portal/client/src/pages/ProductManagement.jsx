import { useEffect, useMemo, useState } from "react";
import FilterBar from "../components/FilterBar";
import Layout from "../components/Layout";
import ProductTable, { ProductTableSkeleton } from "../components/ProductTable";
import Button from "../components/Button";
import { adminService } from "../services/adminService";

const initialForm = {
  name: "",
  sku: "",
  category: "",
  type: "paid",
  unit: "kg",
  stockAvailable: 0,
  reorderLevel: 20,
  price: 0,
  notes: "",
};

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const pageSize = 6;

  const loadProducts = async (options = {}) => {
    const nextPage = options.page ?? page;
    const nextSearch = options.search ?? search;
    const nextType = options.typeFilter ?? typeFilter;

    setError("");
    try {
      const data = await adminService.getProducts({
        page: nextPage,
        limit: pageSize,
        search: nextSearch,
        type: nextType,
      });
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadProducts({ page, search, typeFilter });
  }, [page, search, typeFilter]);

  const totalPages = useMemo(
    () => Math.max(1, pagination?.totalPages || 1),
    [pagination]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: ["stockAvailable", "reorderLevel", "price"].includes(name) ? Number(value) : value,
    }));
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      type: product.type || "paid",
      unit: product.unit,
      stockAvailable: product.stockAvailable,
      reorderLevel: product.reorderLevel,
      price: product.price,
      notes: product.notes || "",
    });
    setMessage("");
    setError("");
  };

  const resetForm = () => {
    setEditingId("");
    setForm(initialForm);
  };

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("");
    setPage(1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await adminService.updateProduct(editingId, form);
        setMessage("Product updated successfully.");
      } else {
        await adminService.createProduct(form);
        setMessage("Product created successfully.");
      }

      resetForm();
      await loadProducts({ page: 1, search, typeFilter });
      setPage(1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    setError("");
    setMessage("");

    try {
      await adminService.deleteProduct(productId);
      setMessage("Product deleted successfully.");
      await loadProducts({ page, search, typeFilter });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete product");
    }
  };

  return (
    <Layout title="Product Management">
      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <section className="admin-page-shell">
        <div className="panel-card product-form-panel">
          <form className="form-grid" onSubmit={handleSubmit}>
          <h2>{editingId ? "Update product" : "Add product"}</h2>
          <label>
            Product name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            SKU
            <input name="sku" value={form.sku} onChange={handleChange} required />
          </label>
          <label>
            Category
            <input name="category" value={form.category} onChange={handleChange} required />
          </label>
          <label>
            Type
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="paid">Paid</option>
              <option value="free">Free</option>
            </select>
          </label>
          <label>
            Unit
            <input name="unit" value={form.unit} onChange={handleChange} />
          </label>
          <label>
            Stock available
            <input
              name="stockAvailable"
              type="number"
              min="0"
              value={form.stockAvailable}
              onChange={handleChange}
            />
          </label>
          <label>
            Reorder level
            <input
              name="reorderLevel"
              type="number"
              min="0"
              value={form.reorderLevel}
              onChange={handleChange}
            />
          </label>
          <label>
            Price
            <input name="price" type="number" min="0" value={form.price} onChange={handleChange} />
          </label>
          <label>
            Notes
            <input name="notes" value={form.notes} onChange={handleChange} />
          </label>

          <div className="inline-actions">
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
            </Button>
            {editingId && (
              <Button variant="ghost" type="button" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>
          </form>
        </div>

        <div className="panel-card product-table-panel">
          <div className="product-table-header">
            <div>
              <h2>Product Inventory</h2>
              <p>Manage stock, free and paid categories, and product visibility.</p>
            </div>
            <FilterBar
              searchValue={search}
              onSearchChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              typeValue={typeFilter}
              onTypeChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              onReset={resetFilters}
            />
          </div>

          {loading ? (
            <ProductTableSkeleton rows={6} />
          ) : (
            <ProductTable
              products={products}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          <div className="table-pagination">
            <Button variant="ghost" type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductManagement;
