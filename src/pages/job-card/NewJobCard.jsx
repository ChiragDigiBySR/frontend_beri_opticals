import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Prescription from "../../components/Prescription";
import Select from "react-select";
import api from "../../utils/api";
import {
  FiTrash2,
  FiEye,
  FiImage,
  FiUser,
  FiCreditCard,
  FiPhone,
  FiMail,
  FiMapPin,
  FiFileText,
  FiPackage,
  FiLoader,
  FiPlus,
  FiMessageSquare,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AddToInventoryModal from "../../components/Addtoinventorymodal";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { handleEnterAsTab } from "../../utils/formNavigation";

// ─── debounce helper ──────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ───── IMAGE NORMALIZATION ───── */
const normalizeToJpeg = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w > h) {
          h = Math.round((h / w) * MAX);
          w = MAX;
        } else {
          w = Math.round((w / h) * MAX);
          h = MAX;
        }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          resolve(
            new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" }),
          );
        },
        "image/jpeg",
        0.6,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];


// ─── Lens category configuration ──────────────────────────────────────────
// Categories treated as "lens" for:
//   1) the 0.5-quantity half-price rule
//   2) the suggested refractive-Index field
// Add more category strings here later (e.g. "GLASS", "CONTACT LENS") if the
// client wants either behavior extended — nothing else needs to change.
const LENS_CATEGORIES = ["LENS"];

// Suggested refractive index values shown as quick-select chips under the
// Index field. Standard industry values — swap in the client's exact
// figures here whenever they provide them.
const LENS_INDEX_SUGGESTIONS = ["1.50", "1.56", "1.60", "1.67", "1.74"];

export default function NewJobCard() {
  const store = useSelector((state) => state.auth.store);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userId = store?.userId;
  const ownerName = store?.ownerName;
  const employees = useSelector((state) => state.employees.data);
  const settings = useSelector((state) => state.settings.data);
  const pageField = useSelector((state) => state.pageField.data);
  const LOYALTY_POINT_VALUE =
    settings?.loyalty?.redemption?.valueOfloyaltyPoints ??
    store?.valueOfloyaltyPoints ??
    0;

  /* -------------------- CUSTOMER -------------------- */
  const [customerData, setCustomerData] = useState({
    name: "",
    countryCode: "+91",
    mobile: "",
    email: "",
    address: "",
    dob: "",
    anniversary: "",
    // orderDate: new Date().toISOString().slice(0, 10),
    orderDate: new Date().toLocaleString("sv-SE").slice(0, 16),
    hasGstNo: false,
    legalName: "",
    gstIn: "",
    panNumber: "",
    stateOfSupply: "",
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [searching, setSearching] = useState(false);
  const [fetchingRx, setFetchingRx] = useState(false);
  const suggestionRef = useRef(null);
  const [mrpCapErrors, setMrpCapErrors] = useState({});

  const debouncedName = useDebounce(customerData.name, 350);
  const debouncedMobile = useDebounce(customerData.mobile, 350);

  useEffect(() => {
    const handler = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (activeField === "name" && debouncedName.trim().length >= 3)
      fetchSuggestions(debouncedName.trim());
  }, [debouncedName]);

  useEffect(() => {
    if (activeField === "mobile" && debouncedMobile.trim().length >= 3)
      fetchSuggestions(debouncedMobile.trim());
  }, [debouncedMobile]);

  const fetchSuggestions = async (q) => {
    try {
      setSearching(true);
      const res = await api.get("/jc/search", { params: { q } });
      if (res.data.success) {
        setSuggestions(res.data.data || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error("Customer search error:", err);
    } finally {
      setSearching(false);
    }
  };

  // select customer by suggestion
  const handleSelectCustomer = async (customer) => {
    setCustomerData((prev) => ({
      ...prev,
      _id: customer._id,
      custNumber: customer.custNumber,
      name: customer.name || "",
      mobile: String(customer.mobile || ""),
      email: customer.email || "",
      address: customer.address || "",
      dob: customer.dob ? customer.dob.slice(0, 10) : "",
      anniversary: customer.anniversary
        ? customer.anniversary.slice(0, 10)
        : "",
    }));

    setSuggestions([]);
    setShowSuggestions(false);

    // Reset membership state for new customer
    setCustomerMembership(null);
    setActiveMembership(null);
    setMembershipLookupQuery("");
    setMembershipLookupError("");

    if (customer.custNumber) {
      await fetchLatestPrescription(customer.custNumber);
    }

    // ── If store uses membership, check if customer is in one ──────────
    if (storeHasMembership && customer.custNumber) {
      try {
        const res = await api.get(`/memberships/customer/${customer.custNumber}`);
        if (res.data.success && res.data.membership) {
          const m = res.data.membership;
          setCustomerMembership(m);
          setActiveMembership(m); // default: use their own
          setAvailableLoyaltyPoints(m.membershipPoints || 0);
        } else {
          // No membership — use individual points
          setAvailableLoyaltyPoints(customer.loyalty_points || 0);
        }
      } catch {
        setAvailableLoyaltyPoints(customer.loyalty_points || 0);
      }
    } else {
      setAvailableLoyaltyPoints(customer.loyalty_points || 0);
    }

    setPaymentDetails((prev) => ({
      ...prev,
      loyaltyPoints: customer.loyalty_points || 0,
    }));
  };

  // Lookup a DIFFERENT membership by membershipId or member mobile number
  const handleMembershipLookup = async () => {
    const q = membershipLookupQuery.trim();
    if (!q) return;
    setMembershipLookupLoading(true);
    setMembershipLookupError("");
    try {
      // API accepts either membershipId (MEM-xxx) or a mobile number
      const res = await api.get("/memberships/lookup", { params: { q } });
      if (res.data.success && res.data.membership) {
        const m = res.data.membership;
        setActiveMembership(m);
        setAvailableLoyaltyPoints(m.membershipPoints || 0);
        setPaymentDetails((prev) => ({ ...prev, loyaltyPoints: 0, loyaltyDiscount: 0 }));
      } else {
        setMembershipLookupError("No membership found for this ID or mobile.");
      }
    } catch (err) {
      setMembershipLookupError(err?.response?.data?.message || "Lookup failed.");
    } finally {
      setMembershipLookupLoading(false);
    }
  };

  const handleClearExternalMembership = () => {
    // Revert to customer's own membership (or individual points)
    if (customerMembership) {
      setActiveMembership(customerMembership);
      setAvailableLoyaltyPoints(customerMembership.membershipPoints || 0);
    } else {
      setActiveMembership(null);
      setAvailableLoyaltyPoints(customerData.loyalty_points || 0);
    }
    setMembershipLookupQuery("");
    setMembershipLookupError("");
    setPaymentDetails((prev) => ({ ...prev, loyaltyPoints: 0, loyaltyDiscount: 0 }));
  };

  const initialRestPrescription = {
    powerRemark: "",
    frm: "",
    cor: "",
    a: "",
    b: "",
    dbl: "",
    afh: "",
    pd: "",
    r: "",
    l: "",
    ed: "",
    dia: "",
    sendMessage: "Yes",
    jcStatus: "Active",
    pstatus: "In-process",
  };

  const fetchLatestPrescription = async (custNumber) => {
    try {
      setFetchingRx(true);
      const res = await api.get(`/jc/${custNumber}/latest-prescription`);
      if (res.data.success && res.data.data) {
        const { contactLens, eyewear, transpose, restprescription } =
          res.data.data;

        const firstProductKey = products[0]?.key;
        if (firstProductKey) {
          const existingRx = prescriptions.find(
            (rx) => rx.productKey === firstProductKey,
          );
          if (existingRx) {
            updatePrescription(existingRx.id, {
              eyewear,
              transpose,
              contactLens,
            });
          } else {
            setPrescriptions((prev) => [
              ...prev,
              {
                id: uuidv4(),
                productKey: firstProductKey,
                eyewear,
                transpose,
                contactLens,
              },
            ]);
          }
        }

        if (restprescription) {
          setRestPrescription({
            ...restprescription,
            sendMessage: "Yes",
            jcStatus: "Active",
            pstatus: "In-process",
          });
        } else {
          setRestPrescription(initialRestPrescription);
        }
      }
    } catch (err) {
      if (err?.response?.status !== 404)
        console.error("Fetch prescription error:", err);
    } finally {
      setFetchingRx(false);
    }
  };

  /* -------------------- BILL DETAILS -------------------- */
  const [billDetails, setBillDetails] = useState({
    billNo: "",
    deliveryDate: "",
    testedBy: "SELF",
    testedByName: store?.testedBy || ownerName || "",
    referredByType: "NONE",
    referName: "",
    referMobile: "",
    autoBillNo: false,
    billNumberPrefix: "",
  });

  /* -------------------- PRODUCTS -------------------- */
  const emptyProduct = {
    key: uuidv4(),
    productCode: "",
    scan: "",
    category: "",
    otherCategory: "",
    otherProductName: "",
    productName: null,
    lensAvailibility: "",
    vendorId: "",
    vendorName: "",
    price: 0,
    discount: 0,
    discountPercent: 0,
    quantity: 1,
    cost: 0,
    subtotal: 0,
    gstPercent: "0",
    gstMode: "CGST/SGST",
    cgst: 0,
    sgst: 0,
    igst: 0,
    gstAmount: 0,
    gstType: "EXCLUDED",
    total: 0,
    bookedBy: userId || "",
    bookedByName: ownerName || "",
    hsnSac: "",
    commissionPercent: 0,
    commissionAmount: 0,
    image: null,
    imageUrl: null,
    bogoGroupId: null,
    isFreeItem: false,
    brand: "",
    pairOrSingle: null,
    selectedColor: "", // NEW
    lensIndex: "",
  };

  /* ------------------------------------------------------------------ 
       BOGO HANDLER
    ------------------------------------------------------------------ */
  const handleApplyBogo = (index) => {
    const paidRow = products[index];
    const groupId = uuidv4();

    const updatedPaid = { ...paidRow, bogoGroupId: groupId, isFreeItem: false };

    const freeRow = {
      ...emptyProduct,
      key: uuidv4(),
      bogoGroupId: groupId,
      isFreeItem: true,
      category: paidRow.category,
      productCode: paidRow.productCode,
      productName: paidRow.productName,
      otherProductName: paidRow.otherProductName,
      otherCategory: paidRow.otherCategory,
      price: paidRow.price,
      cost: paidRow.cost,
      gstPercent: paidRow.gstPercent,
      gstMode: paidRow.gstMode,
      gstType: paidRow.gstType,
      hsnSac: paidRow.hsnSac,
      imageUrl: paidRow.imageUrl,
      quantity: paidRow.quantity,
      bookedBy: paidRow.bookedBy,
      bookedByName: paidRow.bookedByName,
      discount: paidRow.price,
      discountPercent: 100,
      subtotal: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0,
      commissionAmount: 0,
      commissionPercent: 0,
      brand: paidRow.brand || "",
      pairOrSingle: paidRow.pairOrSingle || null,
      selectedColor: paidRow.selectedColor || "",
      lensIndex: paidRow.lensIndex || "",
    };

    const updated = [...products];
    updated[index] = updatedPaid;
    updated.splice(index + 1, 0, freeRow);
    setProducts(updated);

    setProductOptions((prev) => ({ ...prev, [index + 1]: prev[index] || [] }));
  };

  const [products, setProducts] = useState([emptyProduct]);
  const [categoryProducts, setCategoryProducts] = useState({});
  const [productOptions, setProductOptions] = useState({});
  const [vendors, setVendors] = useState([]);
  const [scanLoading, setScanLoading] = useState({});

  // ── Inventory modal state ──
  const [inventoryModal, setInventoryModal] = useState(null);

  const fetchAllVendors = async () => {
    try {
      const res = await api.get("/vendor");
      if (res.data.success) setVendors(res.data.vendors);
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    }
  };

  useEffect(() => {
    fetchAllVendors();
  }, []);

  /* -------------------- PAYMENT -------------------- */
  const [availableLoyaltyPoints, setAvailableLoyaltyPoints] = useState(0);

  const [customerMembership, setCustomerMembership] = useState(null); // customer's own membership
  const [activeMembership, setActiveMembership] = useState(null); // membership being used (own or external)
  const [membershipLookupQuery, setMembershipLookupQuery] = useState("");
  const [membershipLookupLoading, setMembershipLookupLoading] = useState(false);
  const [membershipLookupError, setMembershipLookupError] = useState("");
  const storeHasMembership =
    settings?.loyalty?.mode === "membership_only" ||
    settings?.loyalty?.mode === "both";

  const [paymentDetails, setPaymentDetails] = useState({
    loyaltyPoints: 0,
    subTotal: 0,
    grossTotal: 0,
    total: 0,
    additionalDiscount: 0,
    advance: 0,
    loyaltyDiscount: 0,
    balance: 0,
    transactionType: "CASH",
    remark: "",
  });

  /* -------------------- PRESCRIPTION -------------------- */
  const [prescriptions, setPrescriptions] = useState([]);

  const emptyEye = {
    sph: "",
    cyl: "",
    axis: "",
    vis: "",
    nv_sph: "",
    nv_cyl: "",
    nv_axis: "",
    nv_vis: "",
    add: "",
    pd: "",
  };

  const emptyPrescription = (productKey) => ({
    id: uuidv4(),
    productKey,
    eyewear: { rightEye: { ...emptyEye }, leftEye: { ...emptyEye } },
    transpose: { rightEye: { ...emptyEye }, leftEye: { ...emptyEye } },
    contactLens: { rightEye: { ...emptyEye }, leftEye: { ...emptyEye } },
  });

  const addPrescriptionForProduct = (productKey) => {
    if (prescriptions.find((rx) => rx.productKey === productKey)) return;
    setPrescriptions((prev) => [...prev, emptyPrescription(productKey)]);
  };

  const removePrescription = (rxId) => {
    setPrescriptions((prev) => prev.filter((rx) => rx.id !== rxId));
  };

  const updatePrescription = (rxId, updaterOrValue) => {
    setPrescriptions((prev) =>
      prev.map((rx) => {
        if (rx.id !== rxId) return rx;
        if (typeof updaterOrValue === "function") {
          const prevShape = {
            eyewear: rx.eyewear,
            transpose: rx.transpose,
            contactLens: rx.contactLens,
          };
          const result = updaterOrValue(prevShape);
          return {
            ...rx,
            eyewear: result.eyewear ?? rx.eyewear,
            contactLens: result.contactLens ?? rx.contactLens,
            transpose: result.transpose ?? rx.transpose,
          };
        }
        return {
          ...rx,
          eyewear: updaterOrValue.eyewear ?? rx.eyewear,
          contactLens: updaterOrValue.contactLens ?? rx.contactLens,
          transpose: updaterOrValue.transpose ?? rx.transpose,
        };
      }),
    );
  };

  const [restPrescription, setRestPrescription] = useState({
    powerRemark: "",
    frm: "",
    cor: "",
    a: "",
    b: "",
    dbl: "",
    afh: "",
    pd: "",
    r: "",
    l: "",
    ed: "",
    dia: "",
    sendMessage: "Yes",
    jcStatus: "Active",
    pstatus: "In-process",
  });

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const firstKey = products[0]?.key;
    if (firstKey) {
      setPrescriptions([emptyPrescription(firstKey)]);
    }
  }, []);

  /* -------------------- SCAN HANDLER -------------------- */
  const handleScan = async (index, productCode) => {
    const code = productCode.trim();
    if (!code || code.length < 3) return;

    setScanLoading((prev) => ({ ...prev, [index]: true }));

    try {
      const res = await api.get(`/jc/product/scan/${code}`);

      if (!res.data.success) {
        toast && toast.error(`Product "${code}" not found.`);
        return;
      }

      const {
        scannedProduct,
        category,
        categoryProducts: catProds,
      } = res.data.data;

      let cachedProds = categoryProducts[category];
      if (!cachedProds) {
        setCategoryProducts((prev) => ({ ...prev, [category]: catProds }));
        cachedProds = catProds;
      }

      const options = buildProductOptions(cachedProds);
      setProductOptions((prev) => ({ ...prev, [index]: options }));

      const mrp = scannedProduct.mrp || 0;
      const discount = scannedProduct.discount || 0;
      const discountPercent =
        mrp > 0 ? parseFloat(((discount / mrp) * 100).toFixed(2)) : 0;

      const colorEntries = scannedProduct.colorEntries || [];
      const defaultColor =
        colorEntries.find((c) => Number(c.qty) > 0)?.colorName || "";


      setProducts((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          scan: code,
          productCode: scannedProduct.productCode || code,
          category: category,
          productName: scannedProduct.productName || "",
          price: scannedProduct.mrp || 0,
          cost: scannedProduct.price || 0,
          gstPercent: String(scannedProduct.gst || "0"),
          hsnSac: scannedProduct.hsnSac || "",
          imageUrl: scannedProduct.image || null,
          image: null,
          quantity: 1,
          discount,
          discountPercent,
          brand: scannedProduct.brand || "",
          selectedColor: defaultColor,
        };

        return updated;
      });

      setTimeout(() => calculateProductTotals(index, ""), 0);
    } catch (err) {
      if (err?.response?.status === 404) {
        Swal.fire({
          icon: "warning",
          title: "Product Not Found",
          text: `No product found with code "${code}".`,
          confirmButtonColor: "#F26522",
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        console.error("Scan error:", err);
        Swal.fire({
          icon: "error",
          title: "Scan Failed",
          text: "Could not fetch product. Try again.",
          confirmButtonColor: "#dc2626",
        });
      }
    } finally {
      setScanLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  /* -------------------- PRODUCT HANDLERS -------------------- */
  const handleProductChange = async (index, field, value) => {
    const updated = [...products];

    if (field === "category") {
      updated[index] = {
        ...updated[index],
        ...emptyProduct,
        key: updated[index].key,
        category: value,
        bogoGroupId: updated[index].bogoGroupId,
        isFreeItem: updated[index].isFreeItem,
      };
      setProducts(updated);
      setProductOptions((prev) => ({ ...prev, [index]: [] }));

      if (categoryProducts[value]) {
        setProductOptions((prev) => ({
          ...prev,
          [index]: buildProductOptions(categoryProducts[value]),
        }));
        return;
      }

      try {
        if (value !== "OTHER") {
          const res = await api.get(`/product/category/${value}`);
          if (res.data.success) {
            const prods = res.data.data || [];
            setCategoryProducts((prev) => ({ ...prev, [value]: prods }));
            setProductOptions((prev) => ({
              ...prev,
              [index]: buildProductOptions(prods),
            }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch category products:", error);
      }
      return;
    }

    if (field === "bookedBy") {
      const selectedEmployee = employees.find((emp) => emp._id === value);
      updated[index] = {
        ...updated[index],
        bookedBy: value,
        bookedByName: selectedEmployee?.name || "",
      };
      setProducts(updated);
      setTimeout(() => calculateProductTotals(index), 0);
      return;
    }

    // When quantity changes on a PAID BOGO row, mirror to the free row
    if (
      field === "quantity" &&
      updated[index].bogoGroupId &&
      !updated[index].isFreeItem
    ) {
      updated[index] = { ...updated[index], quantity: value };
      setProducts(updated);
      calculateProductTotals(index, "");

      setProducts((prev) => {
        const next = [...prev];
        const freeIdx = next.findIndex(
          (r) => r.bogoGroupId === updated[index].bogoGroupId && r.isFreeItem,
        );
        if (freeIdx !== -1)
          next[freeIdx] = { ...next[freeIdx], quantity: value };
        return next;
      });

      setTimeout(() => {
        setProducts((prev) => {
          const freeIdx = prev.findIndex(
            (r) => r.bogoGroupId === updated[index].bogoGroupId && r.isFreeItem,
          );
          if (freeIdx !== -1) calculateProductTotals(freeIdx, "");
          return prev;
        });
      }, 0);
      return;
    }

    if (field === "quantity" && updated[index].productCode) {
      updated[index] = { ...updated[index], quantity: value };
      setProducts(updated);
      calculateProductTotals(index, "");
      return;
    }

    if (field === "pairOrSingle") {
      updated[index] = {
        ...updated[index],
        pairOrSingle: value || null,
        quantity:
          value === "PAIR"
            ? 2
            : value === "SINGLE"
              ? 1
              : updated[index].quantity,
      };
      setProducts(updated);
      setTimeout(() => calculateProductTotals(index), 0);
      return;
    }

    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);

    if (field === "discount") calculateProductTotals(index, "discount");
    else if (field === "discountPercent")
      calculateProductTotals(index, "discountPercent");
    else calculateProductTotals(index, "");
  };

  const addProductRow = () =>
    setProducts([...products, { ...emptyProduct, key: uuidv4() }]);

  const removeRow = (key) => {
    if (products.length === 1) return;

    const target = products.find((p) => p.key === key);

    setProducts((prev) => {
      if (!target?.bogoGroupId) return prev.filter((r) => r.key !== key);
      if (!target.isFreeItem)
        return prev.filter((r) => r.bogoGroupId !== target.bogoGroupId);
      return prev
        .filter((r) => r.key !== key)
        .map((r) =>
          r.bogoGroupId === target.bogoGroupId
            ? { ...r, bogoGroupId: null, isFreeItem: false }
            : r,
        );
    });

    setPrescriptions((prev) => prev.filter((rx) => rx.productKey !== key));

    setMrpCapErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getAvailableQty = (productCode, category) => {
    if (!productCode || !category) return null;
    const prods = categoryProducts[category] || [];
    const found = prods.find((p) => p.productCode === productCode);
    return found
      ? Number(found.quantity ?? found.qty ?? found.stock ?? 0)
      : null;
  };

  // NEW
  const getAvailableQtyForColor = (productCode, category, colorName) => {
    if (!productCode || !category || !colorName) return null;
    const prods = categoryProducts[category] || [];
    const found = prods.find((p) => p.productCode === productCode);
    if (!found?.colorEntries?.length) return null;
    const entry = found.colorEntries.find((c) => c.colorName === colorName);
    return entry ? entry.qty : 0;
  };

  // NEW
  const getColorEntriesForProduct = (productCode, category) => {
    if (!productCode || !category) return [];
    const prods = categoryProducts[category] || [];
    const found = prods.find((p) => p.productCode === productCode);
    return found?.colorEntries || [];
  };

  const buildProductOptions = (prods) =>
    prods.map((p) => ({
      value: p.productName,
      label: p.productName,
      productCode: p.productCode,
      cost: p.price,
      price: p.mrp,
      gstPercent: p.gst,
      hsnSac: p.hsnSac,
      imageUrl: p.image,
      brand: p.brand || "",
      discount: p.discount || 0,
    }));

  const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  const calculateProductTotals = (index, lastChanged) => {
    setProducts((prev) => {
      const r2 = (n) => Math.round(n * 100) / 100;
      const updated = [...prev];
      const product = { ...updated[index] };

      // BOGO guard: free items are always ₹0
      if (product.isFreeItem) {
        const price = Number(product.price || 0);
        updated[index] = {
          ...product,
          discount: price,
          discountPercent: 100,
          subtotal: 0,
          gstAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
          commissionAmount: 0,
          commissionPercent: 0,
        };
        return updated;
      }

      const price = Number(product.price || 0);
      const quantity = Number(product.quantity || 1);
      const gstPercent = Number(product.gstPercent || 0);
      const gstMode = product.gstMode;
      const baseAmount = price * quantity;

      let discount = Number(product.discount || 0);
      let discountPercent = Number(product.discountPercent || 0);

      if (lastChanged === "discount" && baseAmount > 0)
        discountPercent = (discount / baseAmount) * 100;
      if (lastChanged === "discountPercent" && baseAmount > 0)
        discount = (baseAmount * discountPercent) / 100;

      discount = Math.min(discount, baseAmount);
      discountPercent = Math.min(discountPercent, 100);

      let subtotal = baseAmount - discount;

      let cgst = 0,
        sgst = 0,
        igst = 0,
        gstAmount = 0,
        total = subtotal;

      if (store?.hasGst) {
        gstAmount =
          product.gstType === "INCLUDED"
            ? subtotal - subtotal * (100 / (100 + gstPercent))
            : (subtotal * gstPercent) / 100;

        if (gstMode === "CGST/SGST") {
          cgst = r2(gstAmount / 2);
          sgst = r2(gstAmount / 2);
        } else igst = gstAmount;

        total =
          product.gstType === "INCLUDED" ? subtotal : subtotal + gstAmount;
      }

      let commissionAmount = 0,
        commissionPercent = 0;
      if (product.bookedBy) {
        const employee = employees.find((emp) => emp._id === product.bookedBy);
        commissionPercent = Number(employee?.commission || 0);
        commissionAmount = (subtotal * commissionPercent) / 100;
      }

      updated[index] = {
        ...product,
        discount: r2(discount),
        discountPercent: r2(discountPercent),
        subtotal: r2(subtotal),
        gstAmount: r2(gstAmount),
        cgst,
        sgst,
        igst,
        total: r2(total),
        commissionPercent: r2(commissionPercent),
        commissionAmount: r2(commissionAmount),
      };
      return updated;
    });
  };

  const calculateTotalsFromProducts = (prods) => {
    let subTotal = 0,
      grossTotal = 0;
    prods.forEach((p) => {
      subTotal += Number(p.subtotal || 0);
      grossTotal += Number(p.total || 0);
    });
    return { subTotal: round2(subTotal), total: round2(grossTotal) };
  };

  useEffect(() => {
    const { subTotal, total } = calculateTotalsFromProducts(products);
    setPaymentDetails((prev) => recalcPayment({ ...prev, subTotal, total }));
  }, [products]);

  const handlePaymentChange = (field, value) => {
    setPaymentDetails((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    setPaymentDetails((prev) => recalcPayment(prev));
  }, [
    paymentDetails.additionalDiscount,
    paymentDetails.advance,
    paymentDetails.loyaltyPoints,
    paymentDetails.total,
  ]);

  const recalcPayment = (prev) => {
    const total = Number(prev.total || 0);

    let loyaltyPoints = Number(prev.loyaltyPoints || 0);
    let loyaltyDiscount = loyaltyPoints * LOYALTY_POINT_VALUE;

    let additionalDiscount = Number(prev.additionalDiscount || 0);
    let advance = Number(prev.advance || 0);

    loyaltyDiscount = Math.min(loyaltyDiscount, total);
    loyaltyPoints = Math.floor(loyaltyDiscount / LOYALTY_POINT_VALUE);

    const afterLoyalty = total - loyaltyDiscount;
    additionalDiscount = Math.min(additionalDiscount, afterLoyalty);
    const afterDiscounts = afterLoyalty - additionalDiscount;

    advance = Math.min(advance, afterDiscounts);

    const balance = Math.max(
      total - loyaltyDiscount - additionalDiscount - advance,
      0,
    );

    if (prev.balance === balance && prev.loyaltyDiscount === loyaltyDiscount)
      return prev;

    return {
      ...prev,
      loyaltyPoints,
      loyaltyDiscount,
      additionalDiscount,
      advance,
      balance,
    };
  };

  /* -------------------- VALIDATION & SUBMIT -------------------- */
  const validateForm = () => {
    if (!customerData.name.trim()) return "Customer name is required";
    const mobile = customerData.mobile.trim();
    if (!mobile) return "Customer mobile is required";
    if (!/^[6-9]\d{9}$/.test(mobile))
      return "Enter a valid 10-digit mobile number";

    // dynamic required from field settings
    if (pageField?.jcPage?.email?.required && !customerData.email.trim())
      return "Email is required";
    if (pageField?.jcPage?.address?.required && !customerData.address.trim())
      return "Address is required";
    if (pageField?.jcPage?.dob?.required && !customerData.dob)
      return "Date of Birth is required";
    if (pageField?.jcPage?.anniversary?.required && !customerData.anniversary)
      return "Anniversary is required";
    if (pageField?.jcPage?.bill_no?.required && !billDetails.billNo)
      return "Bill No. is required";
    if (pageField?.jcPage?.delivery_date?.required && !billDetails.deliveryDate)
      return "Delivery date is required";

    if (pageField?.jcPage?.testedBy?.required && !billDetails.testedBy) {
      if (billDetails.testedBy === "SELF" && !billDetails.testedByName.trim())
        return "Tested by name is required";
      if (
        billDetails.testedBy === "OUTSIDE" &&
        !billDetails.testedByName.trim()
      )
        return "Doctor/Shop name is required";
    }

    // if (!billDetails.deliveryDate) return "Delivery date is required";

    for (let i = 0; i < products.length; i++) {
      const p = products[i],
        row = i + 1;
      if (!p.category) return `Product row ${row}: Category is required`;
      if (p.category === "OTHER" && !p.otherCategory.trim())
        return `Product row ${row}: Other category is required`;
      if (p.category === "OTHER" && !p.otherProductName)
        return `Product row ${row}: Product name is required`;
      if (Number(p.quantity) <= 0)
        return `Product row ${row}: Quantity must be greater than 0`;

      if (LENS_CATEGORIES.includes(p.category)) {
        if (Math.round(Number(p.quantity) * 2) !== Number(p.quantity) * 2)
          return `Product row ${row}: Lens quantity must be in steps of 0.5 (e.g. 0.5, 1, 1.5)`;
      } else if (!Number.isInteger(Number(p.quantity))) {
        return `Product row ${row}: Quantity must be a whole number`;
      }


      if (!p.isFreeItem && Number(p.price) <= 0)
        return `Product row ${row}: Price must be greater than 0`;
      if (!p.bookedBy) return `Product row ${row}: Booked By is required`;
      if (["LENS", "GLASS"].includes(p.category) && !p.lensAvailibility)
        return `Product row ${row}: Lens availability is required`;
      if (p.lensAvailibility === "ORDER" && !p.vendorName.trim())
        return `Product row ${row}: Order To Whom is required`;

      const matchedProd = (categoryProducts[p.category] || []).find(
        (cp) => cp.productCode === p.productCode,
      );
      const colorEntries = matchedProd?.colorEntries || [];

      if (p.productCode && matchedProd?.colorEntries?.length > 0) {

        if (!settings?.features?.allowNegativeInventory && p.productCode && matchedProd?.colorEntries?.length > 0) {

          if (!p.selectedColor) {
            return `Product row ${row} "${p.productName || p.productCode}": Please select a color.`;
          }
          const colorQty = getAvailableQtyForColor(
            p.productCode,
            p.category,
            p.selectedColor,
          );
          if (colorQty !== null && Number(p.quantity) > colorQty) {
            return `Product row ${row} "${p.productName || p.productCode}" (${p.selectedColor}): Only ${colorQty} available, but ${p.quantity} requested.`;
          }
        }
      } else {
        // Skip stock check if the product is an ORDER item
        // Skip stock validation if negative inventory is allowed
        if (!settings?.features?.allowNegativeInventory && p.lensAvailibility !== "ORDER") {
          // if (p.lensAvailibility !== "ORDER") {
          const availableQty = getAvailableQty(p.productCode, p.category);
          if (
            p.productCode &&
            availableQty !== null &&
            Number(p.quantity) > availableQty
          ) {
            return `Product row ${row} "${p.productName || p.productCode}": Only ${availableQty} available, but ${p.quantity} requested.`;
          }
          // }
        }
      }
    }

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (mrpCapErrors[p.key])
        return `Product row ${i + 1}: Free item MRP exceeds paid product price.`;
    }

    if (!paymentDetails.transactionType) return "Transaction type is required";
    return null;
  };

  const handleSubmit = async (markDelivered = false) => {
    const error = validateForm();
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: error,
        confirmButtonColor: "#16a34a",
      });
      return;
    }

    billDetails.autoBillNo = pageField?.jcPage?.auto_bill_no?.required || false; // auto bill number generate
    billDetails.billNumberPrefix = settings.billNumberPrefix || ""; // auto bill number generate

    try {
      dispatch(showLoader());
      const formData = new FormData();
      formData.append("customerData", JSON.stringify(customerData));
      formData.append("billDetails", JSON.stringify(billDetails));
      formData.append("paymentDetails", JSON.stringify(paymentDetails));
      formData.append("prescriptions", JSON.stringify(prescriptions));
      formData.append("restPrescription", JSON.stringify(restPrescription));
      formData.append("products", JSON.stringify(products));
      formData.append("isDelivered", JSON.stringify(markDelivered));
      formData.append("allowNegativeInventory", JSON.stringify(settings.features.allowNegativeInventory || false));
      products.forEach((product, index) => {
        if (product.image instanceof File)
          formData.append(`productImage_${index}`, product.image);
      });

      formData.append("membershipId", activeMembership?.membershipId || "");
      formData.append(
        "useExternalMembership",
        activeMembership &&
          customerMembership &&
          activeMembership.membershipId !== customerMembership.membershipId
          ? "true"
          : "false",
      );

      const { data } = await api.post("jc/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.success) {
        toast.success(`Job Card Created Successfully`, { duration: 2000 });
        resetForm();
        setTimeout(() => {
          navigate("/jc/list");
        }, 2000);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: err.response?.data?.message || err.message,
        confirmButtonColor: "#dc2626",
      });
    } finally {
      dispatch(hideLoader());
    }
  };

  const resetForm = () => {
    const newKey = uuidv4();
    setCustomerData({
      name: "",
      mobile: "",
      email: "",
      address: "",
      dob: "",
      anniversary: "",
      orderDate: new Date().toISOString().slice(0, 10),
    });
    setBillDetails({
      billNo: "",
      deliveryDate: "",
      testedBy: "SELF",
      testedByName: "",
      referredByType: "NONE",
      referName: "",
      referMobile: "",
    });
    setProducts([{ ...emptyProduct, key: newKey }]);
    setPaymentDetails({
      loyaltyPoints: 0,
      subTotal: 0,
      grossTotal: 0,
      total: 0,
      additionalDiscount: 0,
      advance: 0,
      loyaltyDiscount: 0,
      balance: 0,
      transactionType: "",
      remark: "",
    });
    setPrescriptions([emptyPrescription(newKey)]);
    hasInitialized.current = false;
    setRestPrescription(initialRestPrescription);
    setMrpCapErrors({});
    setSuggestions([]);
    setShowSuggestions(false);
    setScanLoading({});
    // Reset membership state as well
    setCustomerMembership(null);
    setActiveMembership(null);
    setMembershipLookupQuery("");
    setMembershipLookupError("");
    setAvailableLoyaltyPoints(0);
  };

  /* -------------------- STYLES -------------------- */
  const inputCls =
    "w-full pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition-all placeholder-gray-400";
  const dateCls =
    "w-full px-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition-all cursor-pointer";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";
  const selectCls =
    "w-full px-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition-all cursor-pointer";
  const disabledInputCls =
    "w-full px-3 py-2.5 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-lg outline-none cursor-not-allowed opacity-70";

  /* -------------------- UI -------------------- */
  return (
    <div className="p-4 mb-24 bg-white rounded-xl shadow space-y-8"
    onKeyDown={handleEnterAsTab}
    >
      {fetchingRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-xl flex items-center gap-3">
            <FiLoader size={20} className="animate-spin text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              Loading latest prescription…
            </span>
          </div>
        </div>
      )}

      {/* ================= CUSTOMER ================= */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <FiUser className="text-orange-400 text-xl" />
          <h2 className="text-base font-bold text-gray-800">
            Customer Details
          </h2>
        </div>
        <div className="border-t border-gray-100 mb-5" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div
            className="relative"
            ref={activeField === "name" ? suggestionRef : null}
          >
            <label className={labelCls}>
              Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {searching && activeField === "name" ? (
                  <FiLoader
                    size={15}
                    className="animate-spin text-orange-400"
                  />
                ) : (
                  <FiUser size={15} />
                )}
              </span>
              <input
                type="text"
                placeholder="Customer name"
                value={customerData.name}
                autoComplete="off"
                onFocus={() => setActiveField("name")}
                onChange={(e) => {
                  setActiveField("name");
                  setCustomerData({ ...customerData, name: e.target.value });
                  if (e.target.value.trim().length < 2) {
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }
                }}
                className={inputCls}
              />
            </div>
            {showSuggestions &&
              activeField === "name" &&
              suggestions.length > 0 && (
                <SuggestionDropdown
                  suggestions={suggestions}
                  onSelect={handleSelectCustomer}
                  onClose={() => setShowSuggestions(false)}
                />
              )}
          </div>

          {/* Country Code */}
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1.5">
                <FiPhone size={14} className="text-gray-800" />
                Country Code
              </span>
            </label>
            <PhoneInput
              country={"in"}
              value={customerData.countryCode}
              onChange={(value, country) => {
                setCustomerData((prev) => ({
                  ...prev,
                  countryCode: `+${country.dialCode}`,
                }));
              }}
              disableCountryCode={false}
              disableSearchIcon
              inputStyle={{
                width: "100%",
                height: "38px",
                fontSize: "13px",
                paddingLeft: "52px",
                border: "1px solid #d1d5db",
                borderRadius: "0.75rem",
                backgroundColor: "#f9fafb",
                color: "#374151",
                outline: "none",
                pointerEvents: "none",
              }}
              buttonStyle={{
                border: "1px solid #d1d5db",
                borderRight: "none",
                borderRadius: "0.75rem 0 0 0.75rem",
                backgroundColor: "#f9fafb",
              }}
              dropdownStyle={{ fontSize: "13px" }}
            />
          </div>

          <div
            className="relative"
            ref={activeField === "mobile" ? suggestionRef : null}
          >
            <label className={labelCls}>
              Mobile <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {searching && activeField === "mobile" ? (
                  <FiLoader
                    size={15}
                    className="animate-spin text-orange-400"
                  />
                ) : (
                  <FiPhone size={15} />
                )}
              </span>
              <input
                type="tel"
                placeholder="10-digit mobile"
                value={customerData.mobile}
                autoComplete="off"
                onFocus={() => setActiveField("mobile")}
                onChange={(e) => {
                  setActiveField("mobile");
                  setCustomerData({ ...customerData, mobile: e.target.value });
                  if (e.target.value.trim().length < 2) {
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }
                }}
                className={inputCls}
              />
            </div>
            {showSuggestions &&
              activeField === "mobile" &&
              suggestions.length > 0 && (
                <SuggestionDropdown
                  suggestions={suggestions}
                  onSelect={handleSelectCustomer}
                  onClose={() => setShowSuggestions(false)}
                />
              )}
          </div>

          {pageField && pageField?.jcPage?.email?.visible && (
            <div>
              <label className={labelCls}>Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiMail size={15} />
                </span>
                <input
                  type="email"
                  placeholder="Email address"
                  value={customerData.email}
                  onChange={(e) =>
                    setCustomerData({ ...customerData, email: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {pageField && pageField?.jcPage?.address?.visible && (
            <div>
              <label className={labelCls}>Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiMapPin size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Address"
                  value={customerData.address}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      address: e.target.value,
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {pageField && pageField?.jcPage?.dob?.visible && (
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input
                type="date"
                value={customerData.dob}
                onChange={(e) =>
                  setCustomerData({ ...customerData, dob: e.target.value })
                }
                className={dateCls}
              />
            </div>
          )}

          {pageField && pageField?.jcPage?.anniversary?.visible && (
            <div>
              <label className={labelCls}>Anniversary</label>
              <input
                type="date"
                value={customerData.anniversary}
                onChange={(e) =>
                  setCustomerData({
                    ...customerData,
                    anniversary: e.target.value,
                  })
                }
                className={dateCls}
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Order Date</label>
            <input type="datetime-local" value={customerData.orderDate}
              onChange={(e) => setCustomerData({ ...customerData, orderDate: e.target.value })} className={dateCls} />
          </div>

          {/* has gst no - for sai optiicians */}
          {store && store.storeNumber == "store-45" && (
            <div>
              <label className={labelCls}>GST Registered?</label>

              <div className="flex items-center gap-10 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasGstNo"
                    checked={customerData.hasGstNo === true}
                    onChange={() =>
                      setCustomerData({
                        ...customerData,
                        hasGstNo: true,
                      })
                    }
                  />
                  Yes
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasGstNo"
                    checked={customerData.hasGstNo === false}
                    onChange={() =>
                      setCustomerData({
                        ...customerData,
                        hasGstNo: false,
                        legalName: "",
                        gstIn: "",
                      })
                    }
                  />
                  No
                </label>
              </div>
            </div>
          )}

          {/* hasGstNo = true, show fields */}
          {customerData.hasGstNo && (
            <>
              <div>
                <label className={labelCls}>Legal Name</label>
                <input
                  type="text"
                  placeholder="Enter Legal Name"
                  value={customerData.legalName}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      legalName: e.target.value,
                    })
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>GSTIN</label>
                <input
                  type="text"
                  placeholder="Enter GSTIN"
                  value={customerData.gstIn}
                  maxLength={15}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      gstIn: e.target.value.toUpperCase(),
                    })
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Pan Number</label>
                <input
                  type="text"
                  placeholder="Enter GSTIN"
                  value={customerData.panNumber}
                  maxLength={15}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      panNumber: e.target.value.toUpperCase(),
                    })
                  }
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>State of Supply</label>

                <select
                  value={customerData.stateOfSupply}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      stateOfSupply: e.target.value,
                    })
                  }
                  className={selectCls}
                >
                  <option value="">Select State</option>

                  {indianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ================= BILL DETAILS ================= */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <FiFileText className="text-xl text-orange-400" />
          <h2 className="text-base font-bold text-gray-800">Bill Details</h2>
        </div>
        <div className="border-t border-gray-100 mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {pageField && pageField?.jcPage?.bill_no?.visible && (
            <div>
              <label className={labelCls}>Bill No.</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiCreditCard size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Bill No."
                  value={billDetails.billNo}
                  onChange={(e) =>
                    setBillDetails({ ...billDetails, billNo: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {pageField && pageField?.jcPage?.delivery_date?.visible && (
            <div>
              <label className={labelCls}>
                Delivery Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={billDetails.deliveryDate}
                onChange={(e) =>
                  setBillDetails({
                    ...billDetails,
                    deliveryDate: e.target.value,
                  })
                }
                className={dateCls}
              />
            </div>
          )}

          {pageField && pageField?.jcPage?.testedBy?.visible && (
            <div>
              <label className={labelCls}>
                Tested By <span className="text-red-500">*</span>
              </label>
              <select
                value={billDetails.testedBy}
                onChange={(e) =>
                  setBillDetails((prev) => ({
                    ...prev,
                    testedBy: e.target.value,
                    testedByName: "",
                  }))
                }
                className={selectCls}
              >
                <option value="SELF">Self</option>
                <option value="OUTSIDE">Outside</option>
              </select>
            </div>
          )}

          {pageField && pageField?.jcPage?.employee?.visible && (
            <div>
              {billDetails.testedBy === "SELF" ? (
                <>
                  <label className={labelCls}>
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={billDetails.testedByName}
                    onChange={(e) =>
                      setBillDetails((prev) => ({
                        ...prev,
                        testedByName: e.target.value,
                      }))
                    }
                    className={selectCls}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className={labelCls}>
                    Doctor / Shop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Doctor name"
                    value={billDetails.testedByName}
                    onChange={(e) =>
                      setBillDetails((prev) => ({
                        ...prev,
                        testedByName: e.target.value,
                      }))
                    }
                    className={inputCls}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {pageField && pageField?.jcPage?.refferredBy?.visible && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Referred By</label>
              <select
                value={billDetails.referredByType}
                onChange={(e) => {
                  const value = e.target.value;
                  setBillDetails((prev) => ({
                    ...prev,
                    referredByType: value,
                    ...(value === "NONE"
                      ? { referName: "", referMobile: "" }
                      : {}),
                  }));
                }}
                className={selectCls}
              >
                <option value="NONE">None</option>
                <option value="CUSTOMER">Customer</option>
                <option value="DOCTOR">Doctor</option>
              </select>
            </div>
            {billDetails.referredByType !== "NONE" && (
              <>
                <div>
                  <label className={labelCls}>Refer Name</label>
                  <input
                    type="text"
                    placeholder="Refer Name"
                    value={billDetails.referName}
                    onChange={(e) =>
                      setBillDetails({
                        ...billDetails,
                        referName: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Refer Mobile</label>
                  <input
                    type="tel"
                    placeholder="Refer Mobile"
                    value={billDetails.referMobile}
                    onChange={(e) =>
                      setBillDetails({
                        ...billDetails,
                        referMobile: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>
        )}

      </section>

      {/* ================= PRODUCTS ================= */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <FiPackage className="text-xl text-orange-400" />
          <h2 className="text-base font-bold text-gray-800">Products</h2>
        </div>
        <div className="border-t border-gray-100 mb-5" />

        {products.map((p, index) => (
          <div
            key={p.key}
            className={`rounded-xl p-5 mb-4 ${p.isFreeItem
              ? "border border-teal-200 bg-teal-50/40"
              : p.bogoGroupId
                ? "border border-green-200 bg-white"
                : "border border-orange-100 bg-white"
              }`}
          >
            {/* ── Row header ── */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                  Product #{index + 1}
                </span>
                {p.isFreeItem && (
                  <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-300 px-3 py-1 rounded-full">
                    🎁 FREE (BOGO)
                  </span>
                )}
                {p.bogoGroupId && !p.isFreeItem && (
                  <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-300 px-3 py-1 rounded-full">
                    BOGO Applied ✓
                  </span>
                )}
                {prescriptions.find((rx) => rx.productKey === p.key) && (
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 px-3 py-1 rounded-full">
                    Rx linked ✓
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* BOGO button */}
                {!p.bogoGroupId && !p.isFreeItem && p.productName && (
                  <button
                    type="button"
                    onClick={() => handleApplyBogo(index)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                  >
                    🎁 Apply BOGO
                  </button>
                )}
                {p.bogoGroupId && !p.isFreeItem && (
                  <button
                    type="button"
                    disabled
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 cursor-default"
                  >
                    BOGO Applied ✓
                  </button>
                )}

                {/* ── Add to Inventory button — shown when product name has no match ── */}
                {!p.isFreeItem &&
                  p.category &&
                  p.category !== "OTHER" &&
                  !p.productCode && (
                    <button
                      type="button"
                      onClick={() =>
                        setInventoryModal({
                          index,
                          productName:
                            productOptions[index]?.length === 0
                              ? p.otherProductName || ""
                              : "",
                          category: p.category,
                        })
                      }
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      <FiPlus size={12} /> Add to Inventory
                    </button>
                  )}

                {/* Rx button */}
                {prescriptions.find((rx) => rx.productKey === p.key) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const rx = prescriptions.find(
                        (r) => r.productKey === p.key,
                      );
                      document
                        .getElementById(`rx-${rx.id}`)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                  >
                    View Rx ↓
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => addPrescriptionForProduct(p.key)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                  >
                    + Add Rx
                  </button>
                )}

                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(p.key)}
                    className="p-2 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <input type="hidden" value={p.productCode} />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {/* Scan */}
              <div>
                <label htmlFor={`scan-${index}`} className={labelCls}>
                  Scan
                </label>
                <div className="relative">
                  {scanLoading[index] && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400">
                      <FiLoader size={14} className="animate-spin" />
                    </span>
                  )}
                  {!scanLoading[index] && p.productName && p.scan && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xs font-bold">
                      ✓
                    </span>
                  )}
                  <input
                    id={`scan-${index}`}
                    type="text"
                    placeholder="Scan barcode"
                    value={p.scan ?? ""}
                    onChange={(e) =>
                      handleProductChange(index, "scan", e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScan(index, e.target.value);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim())
                        handleScan(index, e.target.value);
                    }}
                    className={`${inputCls} pr-8`}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Press Enter or blur to search
                </p>
              </div>

              {/* Category */}
              <div>
                <label htmlFor={`categorySelect-${index}`} className={labelCls}>
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id={`categorySelect-${index}`}
                  value={p.category}
                  onChange={(e) =>
                    handleProductChange(index, "category", e.target.value)
                  }
                  className={selectCls}
                >
                  <option value="">Select</option>
                  {settings ? (
                    settings?.allCategories?.map((cat, idx) => (
                      <option key={idx} value={cat}>
                        {cat}
                      </option>
                    ))
                  ) : (
                    <option value="OTHER">OTHER</option>
                  )}
                </select>
              </div>

              {p.category === "OTHER" && (
                <div>
                  <label
                    htmlFor={`categoryInput-${index}`}
                    className={labelCls}
                  >
                    Other Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`categoryInput-${index}`}
                    type="text"
                    placeholder="Category"
                    value={p.otherCategory}
                    onChange={(e) =>
                      handleProductChange(
                        index,
                        "otherCategory",
                        e.target.value,
                      )
                    }
                    className={inputCls}
                  />
                </div>
              )}

              {/* Product Name */}
              <div>
                <label
                  htmlFor={`productNameSelect-${index}`}
                  className={labelCls}
                >
                  Product Name <span className="text-red-500">*</span>
                  {p.isFreeItem && (
                    <span className="ml-1 text-teal-500 font-normal">
                      (price capped)
                    </span>
                  )}
                </label>
                {p.category === "OTHER" ? (
                  <input
                    id={`productNameInput-${index}`}
                    type="text"
                    placeholder="Product Name"
                    value={p.otherProductName}
                    onChange={(e) =>
                      handleProductChange(
                        index,
                        "otherProductName",
                        e.target.value,
                      )
                    }
                    disabled={p.isFreeItem}
                    className={p.isFreeItem ? disabledInputCls : inputCls}
                  />
                ) : (
                  <Select
                    inputId={`productNameSelect-${index}`}
                    options={productOptions[index] || []}
                    isSearchable
                    isDisabled={false}
                    placeholder="Select"
                    value={
                      productOptions[index]?.find(
                        (opt) => opt.value === p.productName,
                      ) || null
                    }
                    onChange={(selected) => {
                      if (p.isFreeItem) {
                        const paidRow = products.find(
                          (r) =>
                            r.bogoGroupId === p.bogoGroupId && !r.isFreeItem,
                        );
                        const maxPrice = Number(paidRow?.price || 0);
                        const rawPrice = Number(selected.price || 0);
                        const cappedPrice = Math.min(rawPrice, maxPrice);

                        setMrpCapErrors((prev) => ({
                          ...prev,
                          [p.key]: rawPrice > maxPrice,
                        }));
                        if (rawPrice > maxPrice)
                          toast?.error(
                            `Free item price capped at ₹${maxPrice}`,
                          );

                        const updated = [...products];

                        const defaultColor = paidRow?.selectedColor || "";


                        updated[index] = {
                          ...updated[index],
                          productCode: selected.productCode,
                          productName: selected.value,
                          price: cappedPrice,
                          cost: selected.cost,
                          gstPercent: selected.gstPercent,
                          hsnSac: selected.hsnSac,
                          imageUrl: selected.imageUrl || null,
                          image: null,
                          brand: selected.brand || "",
                          selectedColor: defaultColor,
                        };

                        setProducts(updated);
                        setTimeout(() => calculateProductTotals(index, ""), 0);
                        return;
                      }

                      const updated = [...products];
                      const selPrice = selected.price || 0;
                      const selDiscount = selected.discount || 0;
                      const selDiscountPercent =
                        selPrice > 0
                          ? parseFloat(
                            ((selDiscount / selPrice) * 100).toFixed(2),
                          )
                          : 0;

                      const matchedProd = (
                        categoryProducts[p.category] || []
                      ).find((cp) => cp.productCode === selected.productCode);

                      const colorEntries = matchedProd?.colorEntries || [];

                      const defaultColor =
                        colorEntries.find((c) => Number(c.qty) > 0)?.colorName || "";

                      updated[index] = {
                        ...updated[index],
                        productCode: selected.productCode,
                        productName: selected.value,
                        price: selected.price,
                        quantity: 1,
                        cost: selected.cost,
                        gstPercent: selected.gstPercent,
                        hsnSac: selected.hsnSac,
                        imageUrl: selected.imageUrl || null,
                        image: null,
                        brand: selected.brand || "",
                        discount: selDiscount,
                        discountPercent: selDiscountPercent,
                        selectedColor: defaultColor,
                      };
                      setProducts(updated);
                      setTimeout(() => calculateProductTotals(index), 0);
                    }}
                    noOptionsMessage={() =>
                      products[index].category
                        ? "No products found"
                        : "Select category first"
                    }
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: "#e5e7eb",
                        borderRadius: "0.5rem",
                        minHeight: "38px",
                        fontSize: "0.875rem",
                        backgroundColor: p.isFreeItem ? "#f0fdfa" : "#fff",
                        boxShadow: "none",
                        "&:hover": {
                          borderColor: p.isFreeItem ? "#5eead4" : "#fdba74",
                        },
                      }),
                      indicatorSeparator: () => ({ display: "none" }),
                    }}
                  />
                )}
                {p.isFreeItem &&
                  (() => {
                    const paidRow = products.find(
                      (r) => r.bogoGroupId === p.bogoGroupId && !r.isFreeItem,
                    );
                    const selectedOpt = productOptions[index]?.find(
                      (opt) => opt.value === p.productName,
                    );
                    if (
                      selectedOpt &&
                      paidRow &&
                      Number(selectedOpt.price) > Number(paidRow.price)
                    ) {
                      return (
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          ❌ Free item MRP (₹{selectedOpt.price}) exceeds paid
                          item (₹{paidRow.price}) — capped to ₹{paidRow.price}
                        </p>
                      );
                    }
                    return null;
                  })()}
              </div>

              {/* product color qnty */}

              {(() => {
                const selectedProd = (categoryProducts[p.category] || []).find(
                  (cp) => cp.productCode === p.productCode,
                );
                if (!selectedProd?.colorEntries?.length) return null;
                const selectedEntry = selectedProd.colorEntries.find(
                  (c) => c.colorName === p.selectedColor,
                );
                return (
                  <div>
                    <label className={labelCls}>
                      Color <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={p.selectedColor || ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "selectedColor",
                          e.target.value,
                        )
                      }
                      className={selectCls}
                    >
                      {selectedProd.colorEntries.map((c) => (
                        <option
                          key={c.colorName}
                          value={c.colorName}
                          disabled={Number(c.qty) <= 0}
                        >
                          {c.colorName}
                        </option>
                      ))}
                    </select>
                    {selectedEntry && (
                      <p className="text-[10px] mt-0.5 text-gray-500">
                        Available:{" "}
                        <span
                          className={`font-semibold ${Number(selectedEntry.qty) <= 2
                            ? "text-red-500"
                            : "text-green-600"
                            }`}
                        >
                          {selectedEntry.qty}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Product Image */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>Prod. Image</label>
                  {(p.image || p.imageUrl) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (p.image) {
                            const url = URL.createObjectURL(p.image);
                            window.open(url, "_blank");
                          } else if (p.imageUrl)
                            window.open(p.imageUrl, "_blank");
                        }}
                        className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition"
                        title="View Image"
                      >
                        <FiEye size={14} />
                      </button>
                      {p.image && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...products];
                            updated[index].image = null;
                            setProducts(updated);
                          }}
                          className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition"
                          title="Remove Image"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                      {!p.image && p.imageUrl && (
                        <span
                          className="p-1.5 bg-green-50 text-green-500 rounded-lg"
                          title="Existing Image"
                        >
                          <FiImage size={14} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={p.isFreeItem}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const compressed = await normalizeToJpeg(file);
                    const updated = [...products];
                    updated[index].image = compressed;
                    setProducts(updated);
                  }}
                  className="w-full text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-2 cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-50 file:text-orange-600 hover:border-orange-300 transition-all"
                />
              </div>

              {/* Price */}
              <div>
                <label htmlFor={`price-${index}`} className={labelCls}>
                  Price (₹){" "}
                  {!p.isFreeItem && <span className="text-red-500">*</span>}
                  {p.isFreeItem && (
                    <span className="text-teal-500 ml-1">🔒</span>
                  )}
                </label>
                <input
                  id={`price-${index}`}
                  type="number"
                  placeholder="0.00"
                  value={p.price ?? ""}
                  onChange={(e) =>
                    handleProductChange(index, "price", e.target.value)
                  }
                  disabled={p.isFreeItem}
                  className={p.isFreeItem ? disabledInputCls : inputCls}
                />
                {p.isFreeItem &&
                  (() => {
                    const paidRow = products.find(
                      (r) => r.bogoGroupId === p.bogoGroupId && !r.isFreeItem,
                    );
                    if (paidRow)
                      return (
                        <p className="text-[10px] text-teal-600 mt-0.5">
                          Max: ₹{paidRow.price} (paid row MRP)
                        </p>
                      );
                    return null;
                  })()}
              </div>

              {/* Quantity */}
              {/* <div>
                <label htmlFor={`quantity-${index}`} className={labelCls}>
                  Quantity{" "}
                  {!p.isFreeItem && <span className="text-red-500">*</span>}
                  {p.isFreeItem && (
                    <span className="text-teal-500 ml-1">🔒</span>
                  )}
                </label>
                <input
                  id={`quantity-${index}`}
                  type="number"
                  placeholder="1"
                  value={p.quantity ?? ""}
                  onChange={(e) =>
                    handleProductChange(index, "quantity", e.target.value)
                  }
                  disabled={p.isFreeItem}
                  className={
                    p.isFreeItem ? disabledInputCls : inputCls
                  }
                />
                {p.isFreeItem && (
                  <p className="text-[10px] text-teal-600 mt-0.5">
                    Matches paid row qty
                  </p>
                )}
              </div> */}

              {/* Quantity */}
              <div>
                <label htmlFor={`quantity-${index}`} className={labelCls}>
                  Quantity{" "}
                  {!p.isFreeItem && <span className="text-red-500">*</span>}
                  {p.isFreeItem && (
                    <span className="text-teal-500 ml-1">🔒</span>
                  )}
                </label>
                <input
                  id={`quantity-${index}`}
                  type="number"
                  step={LENS_CATEGORIES.includes(p.category) ? "0.5" : "1"}
                  min={LENS_CATEGORIES.includes(p.category) ? "0.5" : "1"}
                  placeholder="1"
                  value={p.quantity ?? ""}
                  onChange={(e) =>
                    handleProductChange(index, "quantity", e.target.value)
                  }
                  disabled={p.isFreeItem}
                  className={
                    p.isFreeItem ? disabledInputCls : inputCls
                  }
                />
                {p.isFreeItem && (
                  <p className="text-[10px] text-teal-600 mt-0.5">
                    Matches paid row qty
                  </p>
                )}
                {!p.isFreeItem && LENS_CATEGORIES.includes(p.category) && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Enter 0.5 for a single lens (half price)
                  </p>
                )}
              </div>

              {/* Discount ₹ */}
              <div>
                <label htmlFor={`discountRs-${index}`} className={labelCls}>
                  Discount (₹){" "}
                  {p.isFreeItem && (
                    <span className="text-teal-500 ml-1">🔒</span>
                  )}
                </label>
                <input
                  id={`discountRs-${index}`}
                  type="number"
                  placeholder="0.00"
                  value={p.discount ?? ""}
                  onChange={(e) =>
                    handleProductChange(index, "discount", e.target.value)
                  }
                  disabled={p.isFreeItem}
                  className={p.isFreeItem ? disabledInputCls : inputCls}
                />
              </div>

              {/* Discount % */}
              <div>
                <label
                  htmlFor={`discountPercent-${index}`}
                  className={labelCls}
                >
                  Discount (%){" "}
                  {p.isFreeItem && (
                    <span className="text-teal-500 ml-1">🔒</span>
                  )}
                </label>
                <input
                  id={`discountPercent-${index}`}
                  type="number"
                  placeholder="0"
                  value={p.discountPercent ?? ""}
                  onChange={(e) =>
                    handleProductChange(
                      index,
                      "discountPercent",
                      e.target.value,
                    )
                  }
                  disabled={p.isFreeItem}
                  className={p.isFreeItem ? disabledInputCls : inputCls}
                />
              </div>

              {/* GST fields — only if store has GST */}
              {store && store?.hasGst && (
                <>
                  <div>
                    <label htmlFor={`gstPercent-${index}`} className={labelCls}>
                      GST %
                    </label>
                    <select
                      id={`gstPercent-${index}`}
                      value={p.gstPercent}
                      onChange={(e) =>
                        handleProductChange(index, "gstPercent", e.target.value)
                      }
                      disabled={p.isFreeItem}
                      className={p.isFreeItem ? disabledInputCls : selectCls}
                    >
                      {
                        settings?.gst?.map((val, index) => {
                          return (
                            <option key={index} value={val}>{val}%</option>
                          )
                        })
                      }
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`gstType-${index}`} className={labelCls}>
                      GST Type
                    </label>
                    <select
                      id={`gstType-${index}`}
                      value={p.gstType}
                      onChange={(e) =>
                        handleProductChange(index, "gstType", e.target.value)
                      }
                      disabled={p.isFreeItem}
                      className={p.isFreeItem ? disabledInputCls : selectCls}
                    >
                      <option value="EXCLUDED">Excluded</option>
                      <option value="INCLUDED">Included</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`gstMode-${index}`} className={labelCls}>
                      GST Mode
                    </label>
                    <select
                      id={`gstMode-${index}`}
                      value={p.gstMode}
                      onChange={(e) =>
                        handleProductChange(index, "gstMode", e.target.value)
                      }
                      disabled={p.isFreeItem}
                      className={p.isFreeItem ? disabledInputCls : selectCls}
                    >
                      <option value="CGST/SGST">CGST/SGST</option>
                      <option value="IGST">IGST</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>GST Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        ₹
                      </span>
                      <input
                        value={p.gstAmount ?? ""}
                        readOnly
                        className="w-full pl-6 pr-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Total */}
              <div>
                <label className={labelCls}>
                  Total{" "}
                  {p.isFreeItem && (
                    <span className="text-teal-600 font-semibold ml-1">
                      (Free)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    ₹
                  </span>
                  <input
                    value={p.isFreeItem ? "0.00" : (p.total ?? "")}
                    readOnly
                    className={`w-full pl-6 pr-3 py-2 text-sm border rounded-lg outline-none cursor-not-allowed ${p.isFreeItem
                      ? "text-teal-600 font-semibold bg-teal-50 border-teal-200"
                      : "text-gray-500 bg-gray-50 border-gray-200"
                      }`}
                  />
                </div>
              </div>

              {/* Booked By */}
              <div>
                <label htmlFor={`bookedBy-${index}`} className={labelCls}>
                  Booked By <span className="text-red-500">*</span>
                </label>
                <select
                  id={`bookedBy-${index}`}
                  value={p.bookedBy}
                  onChange={(e) =>
                    handleProductChange(index, "bookedBy", e.target.value)
                  }
                  className={selectCls}
                >
                  <option value="">Select</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* HSN/SAC — only if store has GST */}
              {store && store?.hasGst && (
                <div>
                  <label htmlFor={`hsnSac-${index}`} className={labelCls}>
                    HSN/SAC
                  </label>
                  <input
                    id={`hsnSac-${index}`}
                    type="text"
                    placeholder="HSN/SAC code"
                    value={p.hsnSac ?? ""}
                    onChange={(e) =>
                      handleProductChange(index, "hsnSac", e.target.value)
                    }
                    disabled={p.isFreeItem}
                    className={p.isFreeItem ? disabledInputCls : inputCls}
                  />
                </div>
              )}

              {/* Lens fields */}
              {["LENS", "CONTACT LENS", "GLASS"].includes(p.category) && (
                <>
                  <div>
                    <label
                      htmlFor={`lensAvailibilty-${index}`}
                      className={labelCls}
                    >
                      Lens Avail <span className="text-red-500">*</span>
                    </label>
                    <select
                      id={`lensAvailibilty-${index}`}
                      value={p.lensAvailibility}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "lensAvailibility",
                          e.target.value,
                        )
                      }
                      className={selectCls}
                    >
                      <option value="">Select</option>
                      <option value="INHOUSE">INHOUSE</option>
                      <option value="ORDER">ORDER</option>
                    </select>
                  </div>


                  {/* Lens Index (refractive index) — LENS_CATEGORIES only */}
                  {LENS_CATEGORIES.includes(p.category) && (
                    <div>
                      <label
                        htmlFor={`lensIndex-${index}`}
                        className={labelCls}
                      >
                        Index
                      </label>
                      <input
                        id={`lensIndex-${index}`}
                        type="text"
                        list={`lensIndexOptions-${index}`}
                        placeholder="e.g. 1.56"
                        value={p.lensIndex ?? ""}
                        onChange={(e) =>
                          handleProductChange(
                            index,
                            "lensIndex",
                            e.target.value,
                          )
                        }
                        className={inputCls}
                      />
                      <datalist id={`lensIndexOptions-${index}`}>
                        {LENS_INDEX_SUGGESTIONS.map((val) => (
                          <option key={val} value={val} />
                        ))}
                      </datalist>
                    </div>
                  )}


                  {/* Pair / Single */}
                  <div>
                    <label
                      htmlFor={`pairOrSingle-${index}`}
                      className={labelCls}
                    >
                      Pair / Single
                    </label>
                    <select
                      id={`pairOrSingle-${index}`}
                      value={p.pairOrSingle ?? ""}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "pairOrSingle",
                          e.target.value,
                        )
                      }
                      className={selectCls}
                    >
                      <option value="">Select</option>
                      <option value="PAIR">Pair</option>
                      <option value="SINGLE">Single</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`orderToWhom-${index}`}
                      className={labelCls}
                    >
                      Order to Whom
                    </label>
                    <select
                      id={`orderToWhom-${index}`}
                      value={p.vendorId}
                      onChange={(e) => {
                        const value = e.target.value;
                        const label =
                          e.target.options[e.target.selectedIndex]?.text || "";
                        const updated = [...products];
                        updated[index] = {
                          ...updated[index],
                          vendorId: value,
                          vendorName: label,
                        };
                        setProducts(updated);
                      }}
                      className={selectCls}
                    >
                      <option value="">Select Vendor</option>
                      {vendors?.map((vendor) => (
                        <option key={vendor._id} value={vendor._id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>


                  {/* product color qnty */}

                  {(() => {
                    if (p.category === "CONTACT LENS") {
                      return (
                        <div>
                          <label className={labelCls}>
                            Color <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter lens color"
                            value={p.selectedColor || ""}
                            onChange={(e) =>
                              handleProductChange(
                                index,
                                "selectedColor",
                                e.target.value,
                              )
                            }
                            className={inputCls}
                          />
                        </div>
                      );
                    }

                    const selectedProd = (categoryProducts[p.category] || []).find(
                      (cp) => cp.productCode === p.productCode,
                    );
                    if (!selectedProd?.colorEntries?.length) return null;
                    const selectedEntry = selectedProd.colorEntries.find(
                      (c) => c.colorName === p.selectedColor,
                    );
                    return (
                      <div>
                        <label className={labelCls}>
                          Color <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={p.selectedColor || ""}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "selectedColor",
                              e.target.value,
                            )
                          }
                          className={selectCls}
                        >
                          {selectedProd.colorEntries.map((c) => (
                            <option
                              key={c.colorName}
                              value={c.colorName}
                              disabled={Number(c.qty) <= 0}
                            >
                              {c.colorName}
                            </option>
                          ))}
                        </select>
                        {selectedEntry && (
                          <p className="text-[10px] mt-0.5 text-gray-500">
                            Available:{" "}
                            <span
                              className={`font-semibold ${Number(selectedEntry.qty) <= 2
                                ? "text-red-500"
                                : "text-green-600"
                                }`}
                            >
                              {selectedEntry.qty}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })()}


                </>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={addProductRow}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all shadow-sm"
          >
            + Add Product
          </button>
        </div>
      </section>

      {/* ================= PAYMENT ================= */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <FiCreditCard className="text-xl text-orange-400" />
          <h2 className="text-base font-bold text-gray-800">Payment Details</h2>
        </div>
        <div className="border-t border-gray-100 mb-5" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LoyaltyPaymentBlock
                storeHasMembership={storeHasMembership}
                customerMembership={customerMembership}
                activeMembership={activeMembership}
                membershipLookupQuery={membershipLookupQuery}
                setMembershipLookupQuery={setMembershipLookupQuery}
                membershipLookupLoading={membershipLookupLoading}
                membershipLookupError={membershipLookupError}
                handleMembershipLookup={handleMembershipLookup}
                handleClearExternalMembership={handleClearExternalMembership}
                availableLoyaltyPoints={availableLoyaltyPoints}
                paymentDetails={paymentDetails}
                handlePaymentChange={handlePaymentChange}
                pageField={pageField}
                inputCls={inputCls}
                labelCls={labelCls}
                pointValue={LOYALTY_POINT_VALUE}
              />

              {pageField && pageField?.jcPage?.add_discount?.visible && (
                <div>
                  <label className={labelCls}>Additional Discount (₹)</label>
                  <input
                    id="additionalDiscountRs"
                    type="number"
                    placeholder="0"
                    value={
                      paymentDetails.additionalDiscount === 0
                        ? ""
                        : paymentDetails.additionalDiscount
                    }
                    onChange={(e) =>
                      handlePaymentChange("additionalDiscount", e.target.value)
                    }
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <label className={labelCls}>Advance (₹)</label>
                <input
                  id="advance"
                  type="number"
                  placeholder="0"
                  value={
                    paymentDetails.advance === 0 ? "" : paymentDetails.advance
                  }
                  onChange={(e) =>
                    handlePaymentChange("advance", e.target.value)
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Transaction Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="transactionType"
                  value={paymentDetails.transactionType}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      transactionType: e.target.value,
                    })
                  }
                  className={selectCls}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NA">NA</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Remarks</label>
                <textarea
                  id="remark"
                  rows={3}
                  placeholder="Any additional notes..."
                  value={paymentDetails.remark}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      remark: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition-all placeholder-gray-400 resize-none"
                />
              </div>
            </div>
          </div>
          <div className="lg:w-72 xl:w-80">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 h-full">
              <h3 className="text-sm font-bold text-gray-800 mb-4">
                Order Summary
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Subtotal", value: paymentDetails.subTotal },
                  pageField && pageField?.jcPage?.loyalty_discount?.visible
                    ? {
                      label: "Loyalty Discount",
                      value: paymentDetails.loyaltyDiscount,
                    }
                    : null,
                  { label: "Gross Total", value: paymentDetails.total },
                ]
                  .filter(Boolean)
                  .map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between items-center text-sm text-gray-600 pb-3 border-b border-orange-100"
                    >
                      <span>{label}</span>
                      <span className="font-medium text-gray-800">
                        ₹{value || "0.00"}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-orange-200">
                <span className="text-sm font-bold text-gray-800">
                  Balance Due
                </span>
                <span className="text-lg font-bold text-orange-500">
                  ₹{paymentDetails.balance || "0.00"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRESCRIPTION ================= */}
      {prescriptions.length > 0 && (
        <section className="space-y-4">
          {prescriptions.map((rx) => {
            const linkedProduct = products.find((p) => p.key === rx.productKey);
            const productIndex = products.findIndex(
              (p) => p.key === rx.productKey,
            );

            return (
              <div
                key={rx.id}
                id={`rx-${rx.id}`}
                className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500 text-xl">🔬</span>
                    <h2 className="text-base font-bold text-gray-800">
                      Prescription — Product #{productIndex + 1}
                    </h2>
                    {linkedProduct?.productName && (
                      <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {linkedProduct.productName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePrescription(rx.id)}
                    disabled={prescriptions.length === 1}
                    className={`p-2 rounded-full transition ${prescriptions.length === 1
                      ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                      : "bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600"
                      }`}
                    title={
                      prescriptions.length === 1
                        ? "At least one prescription required"
                        : "Remove prescription"
                    }
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>

                <Prescription
                  prescription={{
                    eyewear: rx.eyewear,
                    transpose: rx.transpose,
                    contactLens: rx.contactLens,
                  }}
                  setPrescription={(updaterOrValue) =>
                    updatePrescription(rx.id, updaterOrValue)
                  }
                />
              </div>
            );
          })}
        </section>
      )}

      {/* ================= REST PRESCRIPTION ================= */}
      <section className="shadow-lg p-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="powerremark">Power Remark</label>
            <input
              id="powerremark"
              className="input"
              value={restPrescription.powerRemark}
              onChange={(e) =>
                setRestPrescription({
                  ...restPrescription,
                  powerRemark: e.target.value,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {[
            "frm",
            "cor",
            "a",
            "b",
            "dbl",
            "afh",
            "pd",
            "r",
            "l",
            "ed",
            "dia",
          ].map((field) => (
            <div key={field}>
              <label htmlFor={field}>{field.toUpperCase()}</label>
              <input
                id={field}
                className="input"
                value={restPrescription[field]}
                onChange={(e) =>
                  setRestPrescription({
                    ...restPrescription,
                    [field]: e.target.value,
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="shadow-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          <div>
            <label htmlFor="send">Send Message</label>
            <select
              id="send"
              className="input"
              value={restPrescription.sendMessage}
              onChange={(e) =>
                setRestPrescription({
                  ...restPrescription,
                  sendMessage: e.target.value,
                })
              }
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>
      </section>

      {/* ================= SUBMIT ================= */}
      <section className="shadow-lg p-4">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {
            settings?.features?.showDeliveredButtonInJC ?
              <button
                onClick={() => { setRestPrescription({ ...restPrescription, jcStatus: "Active", pstatus: "In-process" }); handleSubmit(true); }}
                className="group relative px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 active:scale-95 cursor-pointer">
                <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition" />
                <span className="relative flex items-center gap-2">Submit & mark as Delivered ✅</span>
              </button>

              :

              <div></div>
          }

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 lg:mt-0">
            <button
              type="button"
              onClick={() => {
                setRestPrescription({
                  ...restPrescription,
                  jcStatus: "Draft",
                  pstatus: "Draft",
                });
                handleSubmit();
              }}
              className="group relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium shadow-md shadow-gray-500/30 hover:shadow-lg hover:shadow-gray-500/40 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition" />
              <span className="relative flex items-center gap-2">
                Save as Draft
              </span>
            </button>
            <button
              onClick={() => {
                setRestPrescription({
                  ...restPrescription,
                  jcStatus: "Active",
                  pstatus: "In-process",
                });
                handleSubmit();
              }}
              className="group relative px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition" />
              <span className="relative flex items-center gap-2">
                Submit & Process
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Add to Inventory slide-in ── */}
      {inventoryModal && (
        <AddToInventoryModal
          prefill={{
            productName: inventoryModal.productName,
            category: inventoryModal.category,
          }}
          onClose={() => setInventoryModal(null)}
          onProductAdded={async (created) => {
            // Refresh category product list so the new item appears in Select
            const cat = inventoryModal.category;
            const idx = inventoryModal.index;

            try {
              const res = await api.get(`/product/category/${cat}`);
              if (res.data.success) {
                const prods = res.data.data || [];
                setCategoryProducts((prev) => ({ ...prev, [cat]: prods }));
                const opts = buildProductOptions(prods);
                setProductOptions((prev) => ({ ...prev, [idx]: opts }));

                // Auto-select the newly created product in this row
                const match = opts.find(
                  (o) => o.productCode === created.productCode,
                );
                if (match) {
                  const updated = [...products];
                  updated[idx] = {
                    ...updated[idx],
                    productCode: match.productCode,
                    productName: match.value,
                    price: match.price,
                    quantity: 1,
                    cost: match.cost,
                    gstPercent: match.gstPercent,
                    hsnSac: match.hsnSac,
                    imageUrl: match.imageUrl || null,
                    image: null,
                    brand: match.brand || "",
                  };
                  setProducts(updated);
                  setTimeout(() => calculateProductTotals(idx), 0);
                }
              }
            } catch (err) {
              console.error("Failed to refresh category products:", err);
            }

            setInventoryModal(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Suggestion Dropdown
// ─────────────────────────────────────────────────────────────────────────────
function SuggestionDropdown({ suggestions, onSelect, onClose }) {
  return (
    <div
      className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
      style={{ animation: "fadeDown 0.15s ease" }}
    >
      <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {suggestions.length} result{suggestions.length !== 1 ? "s" : ""} found
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          ✕
        </button>
      </div>
      {suggestions.map((customer) => (
        <button
          key={customer._id}
          type="button"
          onClick={() => onSelect(customer)}
          className="w-full text-left px-4 py-3 hover:bg-orange-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
            {customer.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {customer.name}
            </p>
            <p className="text-xs text-gray-400">{customer.mobile}</p>
          </div>
          <span className="text-[10px] text-orange-400 font-medium shrink-0">
            Fill →
          </span>
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------
// ----------------- Loyalty of Membership Part -------------------
// ----------------------------------------------------------------
function LoyaltyPaymentBlock({
  storeHasMembership,
  customerMembership,
  activeMembership,
  membershipLookupQuery,
  setMembershipLookupQuery,
  membershipLookupLoading,
  membershipLookupError,
  handleMembershipLookup,
  handleClearExternalMembership,
  availableLoyaltyPoints,
  paymentDetails,
  handlePaymentChange,
  pageField,
  inputCls,
  labelCls,
}) {
  if (!pageField?.jcPage?.loyalty_discount?.visible) return null;

  const isUsingExternalMembership =
    activeMembership &&
    customerMembership &&
    activeMembership.membershipId !== customerMembership.membershipId;

  const isUsingExternalWithNoOwn = activeMembership && !customerMembership;

  return (
    <div className="md:col-span-2 space-y-3">
      {/* ── Membership card banner (shown when customer is in a membership) ── */}
      {storeHasMembership && customerMembership && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-600 text-xs">🪪</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-700 truncate">
                {customerMembership.membershipId}
              </p>
              <p className="text-[10px] text-emerald-600">
                Pool: <span className="font-bold">{customerMembership.membershipPoints} pts</span>
                {" · "}Head: {customerMembership.headName}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full flex-shrink-0">
            Member
          </span>
        </div>
      )}

      {/* ── Active membership being used (if different from customer's own) ── */}
      {storeHasMembership && (isUsingExternalMembership || isUsingExternalWithNoOwn) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-xs">🔗</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide">
                Using External Membership
              </p>
              <p className="text-xs font-bold text-blue-700 truncate">
                {activeMembership.membershipId}
              </p>
              <p className="text-[10px] text-blue-600">
                Pool: <span className="font-bold">{activeMembership.membershipPoints} pts</span>
                {" · "}Head: {activeMembership.headName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearExternalMembership}
            className="text-[10px] font-semibold text-blue-500 hover:text-red-500 bg-blue-100 hover:bg-red-50 border border-blue-200 hover:border-red-200 px-2 py-1 rounded-lg transition flex-shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Loyalty points input ── */}
      <div>
        <label className={labelCls}>
          {storeHasMembership && activeMembership ? (
            <>
              Membership Points{" "}
              <span className="text-gray-400 font-normal">
                (Pool: {availableLoyaltyPoints} pts)
              </span>
            </>
          ) : (
            <>
              Loyalty Points{" "}
              <span className="text-gray-400 font-normal">
                (Available: {availableLoyaltyPoints})
              </span>
            </>
          )}
        </label>
        <input
          id="loyaltyPoint"
          type="number"
          placeholder="0"
          min="0"
          max={availableLoyaltyPoints}
          value={paymentDetails.loyaltyPoints}
          onChange={(e) => {
            let value = Number(e.target.value);
            if (value > availableLoyaltyPoints) value = availableLoyaltyPoints;
            handlePaymentChange("loyaltyPoints", value);
          }}
          className={inputCls}
        />
      </div>

      {/* ── Use another membership card (only shown if store has membership) ── */}
      {storeHasMembership && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Use Another Membership Card
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={membershipLookupQuery}
              onChange={(e) => {
                setMembershipLookupQuery(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleMembershipLookup()}
              placeholder="Enter Membership ID (MEM-…) or member mobile"
              className="flex-1 px-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition placeholder-gray-400"
            />
            <button
              type="button"
              onClick={handleMembershipLookup}
              disabled={membershipLookupLoading || !membershipLookupQuery.trim()}
              className="px-3 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              {membershipLookupLoading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Find"
              )}
            </button>
          </div>
          {membershipLookupError && (
            <p className="text-[10px] text-red-500 font-semibold">{membershipLookupError}</p>
          )}
          <p className="text-[10px] text-gray-400">
            Family members can share membership points. Enter any member's mobile or the membership ID.
          </p>
        </div>
      )}
    </div>
  );
}