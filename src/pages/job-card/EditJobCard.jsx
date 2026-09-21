import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  FiSearch,
  FiEdit2,
  FiMessageSquare,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { v4 as uuidv4 } from "uuid";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { handleEnterAsTab } from "../../utils/formNavigation";

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
// Kept identical to src/pages/.../NewJobCard.jsx — update both together.
const LENS_CATEGORIES = ["LENS"];

// Suggested refractive index values shown in the Index field's datalist.
// Standard industry values — swap in the client's exact figures whenever
// they provide them.
const LENS_INDEX_SUGGESTIONS = ["1.50", "1.56", "1.60", "1.67", "1.74"];


export default function EditJobCard() {
  const store = useSelector((state) => state.auth.store);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = store?.userId;
  const ownerName = store?.ownerName;
  const employees = useSelector((state) => state.employees.data);
  const settings = useSelector((state) => state.settings.data);
  const pageField = useSelector((state) => state.pageField.data);
  const LOYALTY_POINT_VALUE = store?.valueOfloyaltyPoints || 0;

  const location = useLocation();
  const routeJobCardId = location.state?.jobCardId || "";

  const [jobCardIdInput, setJobCardIdInput] = useState(routeJobCardId);
  const [jobCardId, setJobCardId] = useState(null);
  const [loadingJC, setLoadingJC] = useState(false);
  const [jcLoaded, setJcLoaded] = useState(false);

  // ── Customer ──────────────────────────────────────────────────────────────
  // NOTE: orderDate now stores a datetime-local value ("YYYY-MM-DDTHH:MM")
  const [customerData, setCustomerData] = useState({
    name: "",
    countryCode: "+91",
    mobile: "",
    email: "",
    address: "",
    dob: "",
    anniversary: "",
    orderDate: new Date().toLocaleString("sv-SE").slice(0, 16),
    hasGstNo: false,
    legalName: "",
    gstIn: "",
    panNumber: "",
    stateOfSupply: "",
  });

  // ── Bill Details ──────────────────────────────────────────────────────────
  const [billDetails, setBillDetails] = useState({
    billNo: "",
    deliveryDate: "",
    testedBy: "SELF",
    testedByName: ownerName || "",
    referredByType: "NONE",
    referName: "",
    referMobile: "",
  });

  // ── Products ──────────────────────────────────────────────────────────────
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
    selectedColor: "",
    lensIndex: "",
  };

  const [products, setProducts] = useState([emptyProduct]);
  const [categoryProducts, setCategoryProducts] = useState({});
  const [productOptions, setProductOptions] = useState({});
  const [vendors, setVendors] = useState([]);
  const [scanLoading, setScanLoading] = useState({});
  const [mrpCapErrors, setMrpCapErrors] = useState({});

  // ── Payment ───────────────────────────────────────────────────────────────
  const [availableLoyaltyPoints, setAvailableLoyaltyPoints] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState({
    loyaltyPoints: 0,
    subTotal: 0,
    grossTotal: 0,
    total: 0,
    additionalDiscount: "",
    advance: "",
    loyaltyDiscount: 0,
    balance: 0,
    transactionType: "CASH",
    remark: "",
  });

  // ── Prescription ──────────────────────────────────────────────────────────
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

  const [prescriptions, setPrescriptions] = useState([]);
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

  useEffect(() => {
    fetchAllVendors();
  }, []);

  const fetchAllVendors = async () => {
    try {
      const res = await api.get("/vendor");
      if (res.data.success) setVendors(res.data.vendors);
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    }
  };

  // store jc data
  const originalProducts = useRef([]);

  /* ------------------------------------------------------------------ 
       PRESCRIPTION HELPERS
    ------------------------------------------------------------------ */
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

  // ─────────────────────────────────────────────────────────────────────────
  //  LOAD JOB CARD
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (routeJobCardId) handleLoadJobCard(routeJobCardId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadJobCard = async (overrideId) => {
    const id = (overrideId || jobCardIdInput).trim();
    if (!id) {
      Swal.fire({
        icon: "warning",
        title: "Enter Job Card ID",
        confirmButtonColor: "#F26522",
      });
      return;
    }

    try {
      setLoadingJC(true);
      dispatch(showLoader());

      const res = await api.get(`/jc/${id}/edit`);

      if (!res.data.success) {
        Swal.fire({
          icon: "error",
          title: "Not Found",
          text: res.data.message,
          confirmButtonColor: "#F26522",
        });
        return;
      }

      const {
        jobCard,
        products: jcProducts,
        prescription: savedPrescriptions,
        availableLoyaltyPoints: alp,
      } = res.data.data;

      // restprescription is shared — read from first doc
      const savedRestRx = savedPrescriptions?.[0]?.restprescription || null;

      // ── Fill customer ─────────────────────────────────────────────────
      // Converts a saved UTC/ISO date string into a "YYYY-MM-DDTHH:MM" value
      // suitable for an <input type="datetime-local"> without shifting timezone.
      const toISTDateTimeLocal = (utcDateString) => {
        if (!utcDateString) return "";
        return utcDateString.slice(0, 16); // "YYYY-MM-DDTHH:MM" — no timezone shift needed
      };

      setCustomerData({
        _id: jobCard.customerId,
        name: jobCard.name || "",
        countryCode: jobCard.countryCode || "+91",
        mobile: jobCard.mobile || "",
        email: jobCard.email || "",
        address: jobCard.address || "",
        dob: jobCard.dob ? jobCard.dob.slice(0, 10) : "",
        anniversary: jobCard.anniversary
          ? jobCard.anniversary.slice(0, 10)
          : "",
        orderDate: jobCard.orderDate
          ? toISTDateTimeLocal(jobCard.orderDate)
          : (() => {
            const now = new Date();
            const pad = n => String(n).padStart(2, "0");
            return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
          })(),
        hasGstNo: jobCard.hasGstNo || false,
        legalName: jobCard.legalName || "",
        gstIn: jobCard.gstIn || "",
        panNumber: jobCard.panNumber || "",
        stateOfSupply: jobCard.stateOfSupply || "",
      });

      // ── Fill bill details ─────────────────────────────────────────────
      setBillDetails({
        billNo: jobCard.billNo || "",
        deliveryDate: jobCard.deliveryDate
          ? jobCard.deliveryDate.slice(0, 10)
          : "",
        testedBy: jobCard.testedBy || "SELF",
        testedByName: jobCard.testedByName || "",
        referredByType: jobCard.referredByType || "NONE",
        referName: jobCard.referName || "",
        referMobile: jobCard.referMobile || "",
      });

      // ── Fill payment ──────────────────────────────────────────────────
      setAvailableLoyaltyPoints(alp || 0);
      setPaymentDetails({
        loyaltyPoints: jobCard.loyaltyPointsUsed || 0,
        subTotal: jobCard.subTotal || 0,
        grossTotal: jobCard.total || 0,
        total: jobCard.total || 0,
        additionalDiscount: jobCard.additionalDiscount ?? "",
        advance: jobCard.advance ?? "",
        loyaltyDiscount: jobCard.loyaltyDiscount || 0,
        balance: jobCard.balance || 0,
        transactionType: jobCard.transactionType || "",
        remark: jobCard.remark || "",
      });

      // ── Fill products — restore bogoGroupId & isFreeItem ──────────────
      const filledProducts = jcProducts.map((p) => ({
        key: uuidv4(),
        productKey: p.productKey,
        productCode: p.productCode || "",
        scan: p.productCode || "",
        category: p.category || "",
        otherCategory: p.otherCategory || "",
        otherProductName: p.otherProductName || "",
        productName: p.productName || null,
        lensAvailibility: p.lensAvailibility || "",
        vendorId: p.vendorId || "",
        vendorName: p.vendorName || "",
        price: p.price || 0,
        discount: p.discount || 0,
        discountPercent: p.discountPercent || 0,
        quantity: p.quantity || 1,
        cost: p.cost || 0,
        subtotal: p.subtotal || 0,
        gstPercent: String(p.gstPercent || "0"),
        gstMode: p.gstMode || "CGST/SGST",
        cgst: p.cgst || 0,
        sgst: p.sgst || 0,
        igst: p.igst || 0,
        gstAmount: p.gstAmount || 0,
        gstType: p.gstType || "EXCLUDED",
        total: p.total || 0,
        bookedBy: p.bookedBy || "",
        bookedByName: p.bookedByName || "",
        hsnSac: p.hsnSac || "",
        commissionPercent: p.commissionPercent || 0,
        commissionAmount: p.commissionAmount || 0,
        image: null,
        imageUrl: p.image || null,
        // ── BOGO fields restored from DB ──
        bogoGroupId: p.bogoGroupId || null,
        isFreeItem: p.isFreeItem || false,

        brand: p.brand || "",
        pairOrSingle: p.pairOrSingle || null,
        selectedColor: p.selectedColor || "",
        lensIndex: p.lensIndex || "",
      }));

      setProducts(filledProducts);

      originalProducts.current = filledProducts;

      // Populate product dropdowns for each non-OTHER product
      const newCategoryProducts = { ...categoryProducts };
      const newProductOptions = {};

      for (let i = 0; i < filledProducts.length; i++) {
        const p = filledProducts[i];
        if (!p.category || p.category === "OTHER") continue;

        if (!newCategoryProducts[p.category]) {
          try {
            const cr = await api.get(`/product/category/${p.category}`);
            if (cr.data.success) {
              newCategoryProducts[p.category] = cr.data.data || [];
            }
          } catch (_) {
            /* skip */
          }
        }

        if (newCategoryProducts[p.category]) {
          newProductOptions[i] = buildProductOptions(
            newCategoryProducts[p.category],
          );
        }

        if (!filledProducts[i].selectedColor) {
          const catProds = newCategoryProducts[p.category] || [];
          const matchedProd = catProds.find(
            (cp) => cp.productCode === p.productCode,
          );
          const firstColor =
            matchedProd?.colorEntries?.find((c) => Number(c.qty) > 0)
              ?.colorName || "";
          filledProducts[i] = {
            ...filledProducts[i],
            selectedColor: firstColor,
          };
        }
      }

      setCategoryProducts(newCategoryProducts);
      setProductOptions(newProductOptions);

      // ── Fill prescriptions ────────────────────────────────────────────
      // Re-link saved Rx docs to new filledProducts keys by position
      if (Array.isArray(savedPrescriptions) && savedPrescriptions.length > 0) {
        const restored = savedPrescriptions.map((rx, i) => {
          const matchedProduct = rx.productKey
            ? filledProducts.find((fp) => fp.productKey === rx.productKey)
            : filledProducts[i]; // fallback for old data

          return {
            id: uuidv4(),
            productKey: matchedProduct?.key || filledProducts[0]?.key,
            eyewear: rx.eyewear || {
              rightEye: { ...emptyEye },
              leftEye: { ...emptyEye },
            },
            transpose: rx.transpose || {
              rightEye: { ...emptyEye },
              leftEye: { ...emptyEye },
            },
            contactLens: rx.contactLens || {
              rightEye: { ...emptyEye },
              leftEye: { ...emptyEye },
            },
          };
        });
        setPrescriptions(restored);
      } else {
        const firstKey = filledProducts[0]?.key;
        if (firstKey) setPrescriptions([emptyPrescription(firstKey)]);
      }

      // ── Fill restPrescription (shared, from first Rx doc) ─────────────
      if (savedRestRx) {
        setRestPrescription({
          powerRemark: savedRestRx.powerRemark || "",
          frm: savedRestRx.frm || "",
          cor: savedRestRx.cor || "",
          a: savedRestRx.a || "",
          b: savedRestRx.b || "",
          dbl: savedRestRx.dbl || "",
          afh: savedRestRx.afh || "",
          pd: savedRestRx.pd || "",
          r: savedRestRx.r || "",
          l: savedRestRx.l || "",
          ed: savedRestRx.ed || "",
          dia: savedRestRx.dia || "",
          jcStatus: jobCard.status || "Active",
          pstatus: jobCard.pstatus || "In-process",
          sendMessage: "Yes",
        });
      }

      setJobCardId(id);
      setJcLoaded(true);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to Load",
        text: err?.response?.data?.message || err.message,
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setLoadingJC(false);
      dispatch(hideLoader());
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  SCAN HANDLER
  // ─────────────────────────────────────────────────────────────────────────
  const handleScan = async (index, productCode) => {
    const code = productCode.trim();
    if (!code || code.length < 3) return;

    setScanLoading((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await api.get(`/jc/product/scan/${code}`);
      if (!res.data.success) return;

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

      setProductOptions((prev) => ({
        ...prev,
        [index]: buildProductOptions(cachedProds),
      }));

      const mrp = scannedProduct.mrp || 0;
      const discount = scannedProduct.discount || 0;
      const discountPercent =
        mrp > 0 ? parseFloat(((discount / mrp) * 100).toFixed(2)) : 0;

      setProducts((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          scan: code,
          productCode: scannedProduct.productCode || code,
          category,
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
      }
    } finally {
      setScanLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  PRODUCT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
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
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (field === "bookedBy") {
      const emp = employees.find((e) => e._id === value);
      updated[index] = {
        ...updated[index],
        bookedBy: value,
        bookedByName: emp?.name || "",
      };
      setProducts(updated);
      setTimeout(() => calculateProductTotals(index), 0);
      return;
    }

    // Mirror quantity to free row when paid BOGO row changes
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

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  const calculateProductTotals = (index, lastChanged) => {
    setProducts((prev) => {
      const r2 = (n) => Math.round(n * 100) / 100;
      const updated = [...prev];
      const product = { ...updated[index] };

      // BOGO guard: free items always ₹0
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
      const gstPct = Number(product.gstPercent || 0);
      const base = price * quantity;

      let disc = Number(product.discount || 0);
      let discP = Number(product.discountPercent || 0);

      if (lastChanged === "discount" && base > 0) discP = (disc / base) * 100;
      if (lastChanged === "discountPercent" && base > 0)
        disc = (base * discP) / 100;

      disc = Math.min(disc, base);
      discP = Math.min(discP, 100);

      const subtotal = base - disc;

      let cgst = 0,
        sgst = 0,
        igst = 0,
        gstAmount = 0,
        total = subtotal;

      if (store?.hasGst) {
        gstAmount =
          product.gstType === "INCLUDED"
            ? subtotal - subtotal * (100 / (100 + gstPct))
            : (subtotal * gstPct) / 100;

        if (product.gstMode === "CGST/SGST") {
          cgst = r2(gstAmount / 2);
          sgst = r2(gstAmount / 2);
        } else igst = gstAmount;

        total =
          product.gstType === "INCLUDED" ? subtotal : subtotal + gstAmount;
      }

      let commissionPct = 0,
        commissionAmt = 0;
      if (product.bookedBy) {
        const emp = employees.find((e) => e._id === product.bookedBy);
        commissionPct = Number(emp?.commission || 0);
        commissionAmt = (subtotal * commissionPct) / 100;
      }

      updated[index] = {
        ...product,
        discount: r2(disc),
        discountPercent: r2(discP),
        subtotal: r2(subtotal),
        gstAmount: r2(gstAmount),
        cgst,
        sgst,
        igst,
        total: r2(total),
        commissionPercent: r2(commissionPct),
        commissionAmount: r2(commissionAmt),
      };
      return updated;
    });
  };

  useEffect(() => {
    let subTotal = 0,
      grossTotal = 0;
    products.forEach((p) => {
      subTotal += Number(p.subtotal || 0);
      grossTotal += Number(p.total || 0);
    });
    setPaymentDetails((prev) =>
      recalcPayment({
        ...prev,
        subTotal: round2(subTotal),
        total: round2(grossTotal),
      }),
    );
  }, [products]);

  const handlePaymentChange = (field, value) => {
    setPaymentDetails((prev) =>
      recalcPayment({ ...prev, [field]: value === "" ? "" : value }),
    );
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
    let additionalDiscount = Number(prev.additionalDiscount || 0);
    let advance = Number(prev.advance || 0);

    let loyaltyDiscount = loyaltyPoints * LOYALTY_POINT_VALUE;
    loyaltyDiscount = Math.min(loyaltyDiscount, total);
    loyaltyPoints = Math.floor(loyaltyDiscount / LOYALTY_POINT_VALUE);

    const afterLoyalty = total - loyaltyDiscount;
    additionalDiscount = Math.min(additionalDiscount, afterLoyalty);
    advance = Math.min(advance, afterLoyalty - additionalDiscount);

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
      additionalDiscount:
        prev.additionalDiscount === "" ? "" : additionalDiscount,
      advance: prev.advance === "" ? "" : advance,
      balance,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  VALIDATE & SUBMIT
  // ─────────────────────────────────────────────────────────────────────────
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

      // Skip stock validation if negative inventory is allowed
      if (!settings?.features?.allowNegativeInventory && p.productCode && p.lensAvailibility !== "ORDER") {
        // Check available quantity
        const availableQty = getAvailableQty(p.productCode, p.category);

        if (p.productCode && availableQty !== null) {
          // Find how much qty this same product already had in the ORIGINAL JC
          const originalQty = originalProducts.current
            .filter(
              (op) =>
                op.productCode === p.productCode && op.category === p.category,
            )
            .reduce((sum, op) => sum + Number(op.quantity), 0);

          // Effective available = current stock + what was already booked in this JC
          const effectiveAvailable = availableQty + originalQty;

          console.log("effectiveAvailable => ", effectiveAvailable);

          if (Number(p.quantity) > effectiveAvailable) {
            return `Product row ${row} "${p.productName || p.productCode}": Only ${effectiveAvailable} available, but ${p.quantity} requested.`;
          }
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

  const handleSubmit = async () => {
    if (!jobCardId) {
      Swal.fire({
        icon: "warning",
        title: "No Job Card Loaded",
        confirmButtonColor: "#F26522",
      });
      return;
    }

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

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Update Job Card?",
      text: "This will overwrite the existing job card data.",
      showCancelButton: true,
      confirmButtonColor: "#F26522",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Update",
    });
    if (!confirmed.isConfirmed) return;

    try {
      dispatch(showLoader());
      const formData = new FormData();
      formData.append("customerData", JSON.stringify(customerData));
      formData.append("billDetails", JSON.stringify(billDetails));
      formData.append("paymentDetails", JSON.stringify(paymentDetails));
      formData.append("prescriptions", JSON.stringify(prescriptions)); // ← multi-Rx array
      formData.append("restPrescription", JSON.stringify(restPrescription));
      formData.append("products", JSON.stringify(products));

      formData.append("allowNegativeInventory", JSON.stringify(settings?.features?.allowNegativeInventory || false));

      products.forEach((product, index) => {
        if (product.image instanceof File) {
          formData.append(`productImage_${index}`, product.image);
        }
      });

      const { data } = await api.put(`/jc/${jobCardId}/edit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Job Card Updated!",
          timer: 2000,
        }).then(() => navigate("/jc/list"));
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.response?.data?.message || err.message,
        confirmButtonColor: "#dc2626",
      });
    } finally {
      dispatch(hideLoader());
    }
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

  /* ─────────────────────────────────────────────────────────────────────────
       RENDER
    ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="p-4 mb-24 bg-white rounded-xl shadow space-y-8"
    onKeyDown={handleEnterAsTab}
    >
      {jcLoaded && (
        <>
          {/* ══════════════ CUSTOMER DETAILS ══════════════ */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <FiUser className="text-orange-400 text-xl" />
              <h2 className="text-base font-bold text-gray-800">
                Customer Details
              </h2>
            </div>
            <div className="border-t border-gray-100 mb-5" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className={labelCls}>
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FiUser size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={customerData.name}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, name: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
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

              <div>
                <label className={labelCls}>
                  Mobile <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FiPhone size={15} />
                  </span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={customerData.mobile}
                    onChange={(e) =>
                      setCustomerData({
                        ...customerData,
                        mobile: e.target.value,
                      })
                    }
                    className={inputCls}
                  />
                </div>
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
                        setCustomerData({
                          ...customerData,
                          email: e.target.value,
                        })
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

              {/* ── Order Date (now with time) ── */}
              <div>
                <label className={labelCls}>Order Date</label>
                <input
                  type="datetime-local"
                  value={customerData.orderDate}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      orderDate: e.target.value,
                    })
                  }
                  className={dateCls}
                />
              </div>

              {/* has gst no - for sai opticians */}
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
                    <label className={labelCls}>
                      Legal Name <span className="text-red-500">*</span>
                    </label>
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
                    <label className={labelCls}>
                      GSTIN <span className="text-red-500">*</span>
                    </label>
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

          {/* ══════════════ BILL DETAILS ══════════════ */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <FiFileText className="text-xl text-orange-400" />
              <h2 className="text-base font-bold text-gray-800">
                Bill Details
              </h2>
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
                        setBillDetails({
                          ...billDetails,
                          billNo: e.target.value,
                        })
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
                        Doctor / Shop Name{" "}
                        <span className="text-red-500">*</span>
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
                      const v = e.target.value;
                      setBillDetails((prev) => ({
                        ...prev,
                        referredByType: v,
                        ...(v === "NONE"
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

          {/* ══════════════ PRODUCTS ══════════════ */}
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
                    <label
                      htmlFor={`categorySelect-${index}`}
                      className={labelCls}
                    >
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
                      {settings?.allCategories?.map((cat, i) => (
                        <option key={i} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {p.category === "OTHER" && (
                    <div>
                      <label htmlFor={`catInput-${index}`} className={labelCls}>
                        Other Category <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`catInput-${index}`}
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
                    <label className={labelCls}>
                      Product Name <span className="text-red-500">*</span>
                      {p.isFreeItem && (
                        <span className="ml-1 text-teal-500 font-normal">
                          (price capped)
                        </span>
                      )}
                    </label>
                    {p.category === "OTHER" ? (
                      <input
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
                                r.bogoGroupId === p.bogoGroupId &&
                                !r.isFreeItem,
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

                            const matchedProdEdit = (
                              categoryProducts[p.category] || []
                            ).find(
                              (cp) => cp.productCode === selected.productCode,
                            );
                            const editColorEntries =
                              matchedProdEdit?.colorEntries || [];
                            const editDefaultColor =
                              editColorEntries.find((c) => Number(c.qty) > 0)
                                ?.colorName || "";

                            const updated = [...products];
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
                              selectedColor: editDefaultColor,

                              brand: selected.brand || "",
                            };
                            setProducts(updated);
                            setTimeout(
                              () => calculateProductTotals(index, ""),
                              0,
                            );
                            return;
                          }

                          const selPrice = selected.price || 0;
                          const selDiscount = selected.discount || 0;
                          const selDiscountPercent =
                            selPrice > 0
                              ? parseFloat(
                                ((selDiscount / selPrice) * 100).toFixed(2),
                              )
                              : 0;

                          const updated = [...products];
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
                          };
                          setProducts(updated);
                          setTimeout(() => calculateProductTotals(index), 0);
                        }}
                        noOptionsMessage={() =>
                          p.category
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

                    {/* MRP cap warning */}
                    {p.isFreeItem &&
                      (() => {
                        const paidRow = products.find(
                          (r) =>
                            r.bogoGroupId === p.bogoGroupId && !r.isFreeItem,
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
                              ❌ Free item MRP (₹{selectedOpt.price}) exceeds
                              paid item (₹{paidRow.price}) — capped to ₹
                              {paidRow.price}
                            </p>
                          );
                        }
                        return null;
                      })()}
                  </div>

                  {/* COLOR SELECT */}

                  {/* Color select — shown when product has colorEntries */}
                  {(() => {
                    const selectedProd = (
                      categoryProducts[p.category] || []
                    ).find((cp) => cp.productCode === p.productCode);
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
                      <div className="flex items-center gap-1.5">
                        {p.imageUrl && !p.image && (
                          <>
                            <button
                              type="button"
                              onClick={() => window.open(p.imageUrl, "_blank")}
                              className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition"
                              title="View existing image"
                            >
                              <FiEye size={13} />
                            </button>
                            <span
                              className="p-1.5 bg-green-50 text-green-500 rounded-lg"
                              title="Existing image"
                            >
                              <FiImage size={13} />
                            </span>
                          </>
                        )}
                        {p.image instanceof File && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const url = URL.createObjectURL(p.image);
                                window.open(url, "_blank");
                                setTimeout(
                                  () => URL.revokeObjectURL(url),
                                  1000,
                                );
                              }}
                              className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition"
                              title="Preview new image"
                            >
                              <FiEye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const u = [...products];
                                u[index].image = null;
                                setProducts(u);
                              }}
                              className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition"
                              title="Remove image"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
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
                    {p.imageUrl && !p.image && (
                      <p className="text-[10px] text-green-600 mt-0.5">
                        Existing image saved — upload to replace
                      </p>
                    )}
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
                          (r) =>
                            r.bogoGroupId === p.bogoGroupId && !r.isFreeItem,
                        );
                        return paidRow ? (
                          <p className="text-[10px] text-teal-600 mt-0.5">
                            Max: ₹{paidRow.price} (paid row MRP)
                          </p>
                        ) : null;
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
                      disabled={p.isFreeItem || !!p.pairOrSingle}
                      className={
                        p.isFreeItem || p.pairOrSingle
                          ? disabledInputCls
                          : inputCls
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
                      className={p.isFreeItem ? disabledInputCls : inputCls}
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
                        <label className={labelCls}>GST %</label>
                        <select
                          value={p.gstPercent}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "gstPercent",
                              e.target.value,
                            )
                          }
                          disabled={p.isFreeItem}
                          className={
                            p.isFreeItem ? disabledInputCls : selectCls
                          }
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
                        <label className={labelCls}>GST Type</label>
                        <select
                          value={p.gstType}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "gstType",
                              e.target.value,
                            )
                          }
                          disabled={p.isFreeItem}
                          className={
                            p.isFreeItem ? disabledInputCls : selectCls
                          }
                        >
                          <option value="EXCLUDED">Excluded</option>
                          <option value="INCLUDED">Included</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>GST Mode</label>
                        <select
                          value={p.gstMode}
                          onChange={(e) =>
                            handleProductChange(
                              index,
                              "gstMode",
                              e.target.value,
                            )
                          }
                          disabled={p.isFreeItem}
                          className={
                            p.isFreeItem ? disabledInputCls : selectCls
                          }
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
                    <label className={labelCls}>
                      Booked By <span className="text-red-500">*</span>
                    </label>
                    <select
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
                      <label className={labelCls}>HSN/SAC</label>
                      <input
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
                        <label className={labelCls}>
                          Lens Avail <span className="text-red-500">*</span>
                        </label>
                        <select
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
                        <label className={labelCls}>Pair / Single</label>
                        <select
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
                        <label className={labelCls}>Order to Whom</label>
                        <select
                          value={p.vendorId}
                          onChange={(e) => {
                            const value = e.target.value;
                            const label =
                              e.target.options[e.target.selectedIndex]?.text ||
                              "";
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
                          {vendors?.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
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

          {/* ══════════════ PAYMENT ══════════════ */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <FiCreditCard className="text-xl text-orange-400" />
              <h2 className="text-base font-bold text-gray-800">
                Payment Details
              </h2>
            </div>
            <div className="border-t border-gray-100 mb-5" />
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pageField &&
                    pageField?.jcPage?.loyalty_discount?.visible && (
                      <div>
                        <label className={labelCls}>
                          Loyalty Points{" "}
                          <span className="text-gray-400 font-normal">
                            (Available: {availableLoyaltyPoints})
                          </span>
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          max={availableLoyaltyPoints}
                          value={paymentDetails.loyaltyPoints || ""}
                          onChange={(e) => {
                            let v = Number(e.target.value);
                            if (v > availableLoyaltyPoints)
                              v = availableLoyaltyPoints;
                            handlePaymentChange("loyaltyPoints", v);
                          }}
                          className={inputCls}
                        />
                      </div>
                    )}

                  {pageField && pageField?.jcPage?.add_discount?.visible && (
                    <div>
                      <label className={labelCls}>
                        Additional Discount (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={paymentDetails.additionalDiscount}
                        onChange={(e) =>
                          handlePaymentChange(
                            "additionalDiscount",
                            e.target.value,
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Advance (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentDetails.advance}
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
                          className="flex justify-between text-sm text-gray-600 pb-3 border-b border-orange-100"
                        >
                          <span>{label}</span>
                          <span className="font-medium text-gray-800">
                            ₹{value || "0.00"}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="flex justify-between mt-4 pt-3 border-t border-orange-200">
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

          {/* ══════════════ PRESCRIPTIONS (multi) ══════════════ */}
          {prescriptions.length > 0 && (
            <section className="space-y-4">
              {prescriptions.map((rx) => {
                const linkedProduct = products.find(
                  (p) => p.key === rx.productKey,
                );
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

          {/* ══════════════ REST PRESCRIPTION ══════════════ */}
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

          {/* ══════════════ SUBMIT ══════════════ */}
          <section className="shadow-lg p-4">
            <div className="flex items-center justify-end gap-5 mt-8">
              <button
                onClick={() => {
                  setRestPrescription({
                    ...restPrescription,
                    jcStatus: "Active",
                    pstatus: "In-process",
                  });
                  handleSubmit();
                }}
                className="group relative px-7 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition" />
                <span className="relative flex items-center gap-2">
                  <FiEdit2 size={14} /> Update Job Card
                </span>
              </button>
            </div>
          </section>
        </>
      )}

      {!jcLoaded && !loadingJC && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FiSearch size={48} className="mb-4 opacity-20" />
          <p className="text-sm">
            Enter a Job Card ID above and click <strong>Load Job Card</strong>{" "}
            to begin editing.
          </p>
        </div>
      )}
    </div>
  );
}