import { useState, useRef, useEffect } from 'react'
import logo from './assets/logo.jpg'
import barcodImg from './assets/barcode2.png'
import Barcode from 'react-barcode';
import './App.css'
import './A4Workspace.css'
import './MobileStyles.css'
import './PosV2.css'
import PosTerminal from './components/PosTerminal'
import CherpaView from './components/Cherpa/CherpaView'
import Header from './components/Shared/Header'
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CameraScanner from './components/Shared/CameraScanner';

import iconScanner from './assets/cherpa/scanner.webp';
import iconPrecio from './assets/cherpa/precio.webp';
import iconAdd from './assets/cherpa/add_product.png';
import iconPedidos from './assets/cherpa/pedidos.jpg';
import iconBandejas from './assets/cherpa/bandejas.avif';
import iconSpool from './assets/cherpa/spool.avif';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.'))
  ? `http://${window.location.hostname}:5000/api`
  : (window.location.origin.replace(/\/$/, '') + '/api');

// DASHBOARD_DATA with default keys to ensure grid renders immediately and remains resilient
const DEFAULT_DASHBOARD = {
  "dashboard": "Strategic",
  "kpis": {
    "a1": { "value": "...", "label": "CONSULTA", "color": "#003986" },
    "a2": { "value": "...", "label": "INVENTARIO v2.2", "color": "#E1000F" },
    "a3": { "value": "...", "label": "ANÁLISIS", "color": "#009E49" },
    "a4": { "value": "...", "label": "ALERTAS", "color": "#F89406" },
    "a5": { "value": "ADMIN", "label": "AJUSTES", "color": "#334155" },
    "a6": { "value": "...", "label": "VENTAS", "color": "#1abc9c" },
    "a7": { "value": "...", "label": "ACCIONES", "color": "#e91e63" },
    "a8": { "value": "...", "label": "INFORMES", "color": "#d9534f" },
  }
};


const DashboardIcons = {
  a1: () => <img src={iconScanner} alt="Scanner" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />,
  a2: () => <img src={iconPrecio} alt="Precio" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />,
  a3: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mono-icon">
      <line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  ),
  a4: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mono-icon">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
    </svg>
  ),
  a5: () => <img src={iconSpool} alt="Ajustes" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />,
  a6: () => <img src={iconPedidos} alt="Ventas" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />,
  a7: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mono-icon">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  a8: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mono-icon">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  ),
  a9: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mono-icon">
      <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5C17.4 6.2 14.1 3 10 3 6.9 3 4.3 4.9 3.3 7.7 1.4 8.7 0 10.7 0 13c0 3.3 2.7 6 6 6h11.5z"></path>
      <polyline points="13 13 10 10 7 13"></polyline><line x1="10" y1="10" x2="10" y2="16"></line>
    </svg>
  )
};

// --- SMART SEARCH UTILITIES ---
const highlightText = (text, highlight) => {
  if (!text) return '';
  if (!highlight || !highlight.trim()) return text;
  
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
  
  return (
    <span>
      {parts.map((part, i) => (
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} style={{ 
            backgroundColor: '#FFD700', 
            color: '#000',
            padding: '0 2px', 
            borderRadius: '4px', 
            fontWeight: '950',
            display: 'inline-block',
            lineHeight: '1.2'
          }}>{part}</mark>
        ) : part
      ))}
    </span>
  );
};

function App() {
  const [view, setView] = useState(window.innerWidth < 1024 ? 'scan' : 'landing') // Mobile opens Cherpa, Desktop opens Landing
  const [showSplash, setShowSplash] = useState(true)
  const [barcode, setBarcode] = useState('')
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [reportProduct, setReportProduct] = useState(null)
  const [lookupBarcode, setLookupBarcode] = useState('')
  const [lookupResult, setLookupResult] = useState(null)

  const [products, setProducts] = useState([])
  const [scanMode, setScanMode] = useState('manual')
  const [showResultModal, setShowResultModal] = useState(false)
  const [categories, setCategories] = useState([])
  const [dashboardData, setDashboardData] = useState(DEFAULT_DASHBOARD)
  const [loading, setLoading] = useState(false)

  // Ticket Spool State
  const [ticketSpool, setTicketSpool] = useState([]);
  const [showSpoolModal, setShowSpoolModal] = useState(false);
  const [spoolSearchBarcode, setSpoolSearchBarcode] = useState('');
  const [spoolFoundProduct, setSpoolFoundProduct] = useState(null);
  const [spoolQuantity, setSpoolQuantity] = useState(1);
  const [ticketSpoolPage, setTicketSpoolPage] = useState(0);
  const [printingSpool, setPrintingSpool] = useState(null); // Filtered spool for selective printing
  const [ticketOrientation, setTicketOrientation] = useState('landscape');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sales, setSales] = useState([]);
  const [reportSummary, setReportSummary] = useState({ total_revenue: 0, total_orders: 0 });
  const [showToast, setShowToast] = useState(false);
  const [buyUnits, setBuyUnits] = useState(1);
  const [postSaveAction, setPostSaveAction] = useState(null);
  const [lastAddedId, setLastAddedId] = useState(null); // Fix: Defined missing state
  const [ticketHistory, setTicketHistory] = useState([]);
  const [cherpaSubPage, setCherpaSubPage] = useState(window.innerWidth < 1024 ? 'scanner' : null); // Lifted from CherpaView for Header sync
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isDimmed, setIsDimmed] = useState(false);
  const wakeLockRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  const inputRef = useRef(null)
  const lookupInputRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // AGGRESSIVE MOBILE REDIRECT
  useEffect(() => {
    if (isMobile && view === 'landing') {
      console.log("Forcing mobile view...");
      setView('scan');
    }
  }, [isMobile, view]);

  // --- SCREEN WAKE LOCK & INACTIVITY DIMMER ---
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          if (!wakeLock || wakeLock.released) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('✅ Wake Lock is active');
            wakeLock.addEventListener('release', () => {
              console.log('⚠️ Wake Lock was released');
            });
          }
        } catch (err) {
          console.error(`Wake Lock Error: ${err.message}`);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    const resetInactivityTimer = () => {
      setIsDimmed(false);
      // Try to re-request if released or null (aggresive keep-alive)
      requestWakeLock();

      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      // 5 Minutes = 300,000ms
      inactivityTimerRef.current = setTimeout(() => {
        setIsDimmed(true);
      }, 300000);
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(name => document.addEventListener(name, resetInactivityTimer, true));

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial request (might be blocked by browser until first interaction)
    requestWakeLock();
    resetInactivityTimer();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      events.forEach(name => document.removeEventListener(name, resetInactivityTimer, true));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (wakeLock) wakeLock.release();
    };
  }, []);


  useEffect(() => {
    fetchData();
  }, []);

  // AUTO REFRESH WHEN CHANGING TABS
  useEffect(() => {
    if (selectedKpi) {
      if (selectedKpi === 'a2') setCurrentProductPage(1); // Reset page when opening inventory
      fetchData();
    }
  }, [selectedKpi]);

  useEffect(() => {
    if (selectedKpi === 'a2') {
      const isBarcode = /^\d{4,}$/.test(productSearch);

      const triggerSearch = async () => {
        // If it's a barcode, try exact lookup first for "Scan to Edit"
        if (isBarcode) {
          try {
            const res = await fetch(`${API_BASE}/product/${productSearch}`);
            const found = await res.json();
            if (found && found.id) {
              setEditingProduct(found);
              setProductSearch(''); // Clear search after auto-edit trigger
              return;
            }
          } catch (e) { console.error(e); }
        }
        fetchData();
      };

      const timer = setTimeout(triggerSearch, 150);
      return () => clearTimeout(timer);
    }
  }, [productSearch, currentProductPage]);

  // fetchData function remains here to be shared

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Forced migration to ensure keyboard is on by default for everyone now
    if (localStorage.getItem('keyboard_migrated_v2') !== 'true') {
        localStorage.setItem('keyboardForced', 'true');
        localStorage.setItem('keyboard_migrated_v2', 'true');
    }

    // Standard timer for splash
    if (params.get('skipSplash') === 'true') {
      setShowSplash(false);
    } else {
      const timer = setTimeout(() => setShowSplash(false), 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  // formatDuration remains here to be shared
  // formatDuration remains here to be shared

  const formatDuration = (start, end) => {
    const diff = Math.floor((end - start) / 1000);
    const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const secs = String(diff % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // fetchData is shared



  const fetchData = async () => {
    try {
      setLoading(true);
      const searchParam = productSearch ? `&search=${encodeURIComponent(productSearch)}` : '';
      const endpoints = [
        `${API_BASE}/products?page=${currentProductPage}&limit=50${searchParam}`,
        `${API_BASE}/categories`,
        `${API_BASE}/dashboard`,
        `${API_BASE}/sales`,
        `${API_BASE}/reports/summary`,
        `${API_BASE}/spool`,
        `${API_BASE}/spool/history`
      ];

      const responses = await Promise.all(endpoints.map(url =>
        fetch(url).catch(e => ({ ok: false, json: () => null }))
      ));

      const [prodRes, catData, dashData, saleData, summData, spoolData, historyData] = await Promise.all(
        responses.map(res => res.ok ? res.json().catch(() => null) : null)
      );

      if (prodRes) {
        if (Array.isArray(prodRes)) {
          setProducts(prodRes);
          setTotalProducts(prodRes.length);
        } else {
          const newProducts = prodRes.products || [];
          if (currentProductPage > 1) {
            setProducts(prev => {
              // Avoid duplicates if any
              const existingIds = new Set(prev.map(p => p.id));
              const filtered = newProducts.filter(p => !existingIds.has(p.id));
              return [...prev, ...filtered];
            });
          } else {
            setProducts(newProducts);
          }
          setTotalProducts(prodRes.total || 0);
        }
      }
      if (catData) setCategories(catData);
      if (dashData) setDashboardData(dashData || DEFAULT_DASHBOARD);
      if (saleData) setSales(saleData || []);
      if (summData) setReportSummary(summData || { total_revenue: 0, total_orders: 0 });
      if (spoolData) setTicketSpool(spoolData || []);
      if (historyData) setTicketHistory(historyData || []);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const keepFocus = () => {
      if (showSplash) return;
      if (showAddModal || editingProduct || reportProduct || showSpoolModal || showResultModal || view === 'add' || error === 'Producto no encontrado') {
        return;
      }

      // Removed isMobile block because user wants constant focus even on mobile scanners
      // if (isMobile) return; 

      const activeEl = document.activeElement;
      const isUserTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      if (isUserTyping && activeEl !== inputRef.current) return;

      if (view === 'scan' && inputRef.current) {
        if (document.activeElement !== inputRef.current) {
          if (inputRef.current.offsetParent !== null) {
            inputRef.current.focus();
            // Critical for iOS/Desktop hardware scanners: trigger a click if focus isn't enough
            inputRef.current.click();
          }
        }
      }
    };

    // On mobile, we DON'T run the interval to allow normal OS keyboard and scrolling behavior
    let interval = setInterval(keepFocus, 3000);

    const handleWindowTouchOrClick = (e) => {
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
      const isButton = target.tagName === 'BUTTON' || target.closest('button');

      if (isInput) {
        // Just let the browser handle focus/keyboard naturally on click
        return;
      }

      if (isButton) return;

      if (!isMobile && (view === 'scan' || view === 'landing')) {
        keepFocus();
      }
    };

    window.addEventListener('mousedown', handleWindowTouchOrClick);
    window.addEventListener('touchstart', handleWindowTouchOrClick, { passive: true });
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        keepFocus();
      }
    });

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('mousedown', handleWindowTouchOrClick);
      window.removeEventListener('touchstart', handleWindowTouchOrClick);
    };
  }, [view, product, showAddModal, editingProduct, showSpoolModal, error, isMobile, cherpaSubPage]);

  useEffect(() => {
    setShowAddModal(false);
    setShowResultModal(false);
    setShowSpoolModal(false);
    setScanMode('manual');
    setCherpaSubPage(null); // Reset Cherpa sub-page when layout view changes
  }, [view]);

  const handleScan = async (e, forcedBarcode = null) => {
    if (e) e.preventDefault();
    const finalBarcode = forcedBarcode || barcode;
    if (!finalBarcode) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/product/${finalBarcode}`);
      const found = await res.json();
      if (found && found.id) {
        setProduct(found);
        setError('');
        setShowResultModal(true);
      } else {
        setProduct(null);
        setError('Producto no encontrado');
        setShowResultModal(true); // Show modal for error too
      }
    } catch (err) {
      setError('Server Offline');
      setShowResultModal(true);
      console.error('Scan Error:', err);
    }
  }

  // --- NEW: AUTO CLOSE TIMER & HANDLER ---
  const handleCloseModal = (skipRefocus = false) => {
    setShowResultModal(false);
    setProduct(null);
    setBarcode('');
    setError('');
    // Focus back on search input ONLY if not skipping
    if (!skipRefocus) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 200);
    }
  };

  useEffect(() => {
    let timer;
    if (showResultModal && product) {
      timer = setTimeout(() => {
        handleCloseModal();
      }, 10000); // 10 Seconds Auto-Close for Success
    }
    return () => clearTimeout(timer);
  }, [showResultModal, product]);

  // AUTO CLOSE ERROR
  useEffect(() => {
    let timer;
    // Don't auto-close error if it's the "not found" screen that leads to "Add Product"
    if (error && error !== 'Producto no encontrado' && error !== 'Producto no encontrado en inventario') {
      timer = setTimeout(() => {
        setError('');
        setBarcode('');
        // Minimal refocus logic
        if (inputRef.current && !showAddModal && !editingProduct) {
          inputRef.current.focus();
        }
      }, 4000); // 4 Seconds Auto-Close for Error
    }
    return () => clearTimeout(timer);
  }, [error, showAddModal, editingProduct]);


  const calculateTotal = () => {
    if (!product) return 0;
    const price = parseFloat(product.sell_price);
    // Logic: 2nd unit -50%
    if (product.offer > 0 || product.name.toLowerCase().includes('promo')) {
      if (buyUnits <= 1) return price * buyUnits;
      const fullPriceUnits = 1;
      const discountedUnits = buyUnits - 1;
      return (price * fullPriceUnits) + (price * 0.5 * discountedUnits);
    }
    return price * buyUnits;
  };

  const handleQuickUpdate = async (id, data) => {
    try {
      const res = await fetch(`${API_BASE}/product/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
        return true;
      }
      alert('⚠️ No se pudo actualizar: ' + (result.error || 'Error desconocido'));
      return false;
    } catch (err) {
      console.error('Quick Update Error:', err);
      alert('❌ Error de conexión al actualizar precio.');
      return false;
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const onScanSuccess = (decodedText) => {
    if (showResultModal) return; // Don't scan while modal is open
    setBarcode(decodedText);
    handleScan({ preventDefault: () => { } }, decodedText);
  };



  // --- PRODUCT MANAGEMENT & INVENTORY LOGIC ---

  const handleLookup = async (e, forcedBarcode = null) => {
    if (e) e.preventDefault();
    const finalBarcode = forcedBarcode || lookupBarcode;
    if (!finalBarcode) return;

    setLoading(true);
    try {
      // If it looks like a NAME Search (not numeric or shorter than typical EAN)
      if (isNaN(finalBarcode) || finalBarcode.length < 5) {
        setSelectedKpi('a2');
        setProductSearch(finalBarcode);
        setLoading(false);
        setLookupBarcode('');
        return;
      }

      const res = await fetch(`${API_BASE}/product/${finalBarcode}`);
      const p = await res.json();
      setLookupResult(p && p.id ? p : 'no_found');

      // Clear for next input but keep result visible
      setLookupBarcode('');

      if (lookupInputRef.current) {
        lookupInputRef.current.focus();
      }
    } catch (err) {
      setLookupResult('no_found');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      barcode: formData.get('barcode'),
      name: formData.get('name'),
      price_buy: formData.get('price_buy'),
      sell_price: formData.get('price_sell'),
      offer: formData.get('offer') || '0',
      stock_current: parseInt(formData.get('stock')) || 0,
      expiry: formData.get('expiry') || null
    };

    try {
      const res = await fetch(`${API_BASE}/product/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        setEditingProduct(null);
        fetchData();
        alert('Producto actualizado con éxito');
      } else {
        console.error('Update Error:', result);
        alert('Error: ' + (result.error || 'No se pudo actualizar el producto.'));
      }
    } catch (err) {
      console.error('Connection Error:', err);
      alert('Error de conexión al actualizar.');
    }
  };

  const handleSaveProduct = async (dataOrEvent) => {
    let data;
    let isEvent = false;

    if (dataOrEvent && dataOrEvent.preventDefault) {
      dataOrEvent.preventDefault();
      isEvent = true;
      const form = dataOrEvent.target;
      const formData = new FormData(form);
      data = {
        barcode: formData.get('barcode'),
        name: formData.get('name'),
        price_buy: formData.get('price_buy'),
        sell_price: formData.get('price_sell'),
        offer: formData.get('offer') || 0,
        stock_current: formData.get('stock') || 0,
        expiry: formData.get('expiry') || ''
      };
    } else {
      data = dataOrEvent;
    }

    // 1. Check if product already exists
    const exists = products.find(p => p.barcode === data.barcode);
    if (exists) {
      const msg = `⚠️ ERROR: El producto "${exists.name}" ya existe con este código.`;
      alert(msg);
      return { success: false, error: msg };
    }

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (result.success) {
        if (isEvent) {
          dataOrEvent.target.reset();
          if (showAddModal) setShowAddModal(false);
        }

        fetchData();

        // ONLY show the global App-level PostSaveAction if NOT in Cherpa view
        // OR if called from the global "Add" modal
        if (view !== 'scan' || isEvent) {
          setPostSaveAction({
            product: result.product || { ...data, id: result.id },
            cantidad: 1
          });
        }

        return { success: true, product: result.product || { ...data, id: result.id } };
      } else {
        const errorMsg = result.error || result.message || 'Error desconocido';
        alert('⚠️ Error al guardar: ' + errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('Save Error:', err);
      alert('Error de conexión al guardar: ' + err.message);
      return { success: false, error: 'Error de conexión' };
    }
  };
  const handleDeleteProduct = async (id) => {
    if (!id) return;
    if (!confirm('¿Seguro que deseas eliminar este producto definitivamente?')) return;
    try {
      const res = await fetch(`${API_BASE}/product/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        alert('✅ Producto eliminado');
        fetchData();
      } else {
        alert('❌ Error: ' + (result.error || 'No se pudo eliminar'));
      }
    } catch (err) {
      alert('Error de red al intentar eliminar');
    }
  };


  // === TICKET SPOOL FUNCTIONS ===

  const getEAN13CheckDigit = (s) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(s[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const res = (10 - (sum % 10)) % 10;
    return res;
  };

  const generateCarneBarcode = (item) => {
    if (!item) return '0000000000000';
    // If pre-generated Carrefour barcode stored → use directly
    if (item.barcode && item.barcode.startsWith('2') && item.barcode.length === 13) {
      return item.barcode;
    }
    // FIXED product code '946562' (from Carrefour bandeja) - only price changes
    const FIXED_CODE = '946562';
    const cents = Math.round(parseFloat(item.sell_price || 0) * 100);
    const priceStr = String(cents).padStart(5, '0');
    const full12 = `2${FIXED_CODE}${priceStr}`;
    const checkDigit = getEAN13CheckDigit(full12);
    return `${full12}${checkDigit}`;
  };

  const handleTestPDF = async (customConfig = {}, overriddenSpool = null, skipDelete = false) => {
    const { filename = `tickets-carrefour-${new Date().getTime()}.pdf`, orientation = 'landscape' } =
      typeof customConfig === 'string' ? { filename: customConfig, orientation: 'landscape' } : customConfig;

    const activeSpool = overriddenSpool || ticketSpool;
    setPrintingSpool(activeSpool); // Use this subset for PDF capture

    setTicketOrientation(orientation);

    if (activeSpool.length === 0) {
      alert("La lista de impresión está vacía.");
      setPrintingSpool(null);
      return;
    }

    // Show loading
    const btn = document.querySelector('.btn-alert-primary') || document.querySelector('.btn-imprimir-final') || document.querySelector('.btn-primary-mini');
    const originalText = btn ? (btn.textContent || '') : '';
    if (btn) btn.textContent = '⏳ PROCESANDO...';

    // Determine page size: if ANY item is carne/bandeja use 30, else 20
    const hasCarne = activeSpool.some(i => i?.is_bandeja == 1 || i?.isBandeja);
    const hasProducts = activeSpool.some(i => !(i?.is_bandeja == 1 || i?.isBandeja));
    // If mixed, use 20 (product layout is dominant for safety). Pure carne = 30.
    const ITEMS_PER_PAGE = (hasCarne && !hasProducts) ? 30 : 20;
    const numPages = Math.ceil(activeSpool.length / ITEMS_PER_PAGE);

    try {
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4',
        compress: true // ENABLE COMPRESSION
      });

      // Dimensiones para Portrait o Landscape
      const pageWidth = orientation === 'portrait' ? 210 : 297;
      const pageHeight = orientation === 'portrait' ? 297 : 210;

      for (let p = 0; p < numPages; p++) {
        if (btn) btn.textContent = `⏳ GENERANDO PÁG ${p + 1}/${numPages}...`;

        setTicketSpoolPage(p);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const element = document.getElementById('a4-canvas');
        if (!element) throw new Error("Canvas no encontrado");

        const originalTransform = element.style.transform;
        // 1) REMOVE TRANSFORM
        element.style.setProperty('transform', 'none', 'important');

        // 2) CRITICAL FIX: WAIT FOR BROWSER TO RE-PAINT FULL SIZE BEFORE CAPTURE
        await new Promise(r => setTimeout(r, 150));

        const canvas = await html2canvas(element, {
          scale: 5.0, // HIGH DEFINITION
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 0,
        });

        if (originalTransform) {
          element.style.transform = originalTransform;
        } else {
          element.style.removeProperty('transform');
        }

        // USING LOSSLESS PNG FOR MAXIMUM CLEAR TEXT & BARCODES
        const imgData = canvas.toDataURL('image/png');
        if (!imgData || imgData === 'data:,') {
          throw new Error('Fallo al capturar el ticket.');
        }
        if (p > 0) pdf.addPage();
        // ADDING HIGHEST QUALITY PNG
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      // 1. Generate Blob and Open in New Tab (NO AUTO DOWNLOAD)
      const finalFileName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      try {
        window.open(blobUrl, '_blank');
      } catch (e) {
        console.warn("Popup blocked");
        alert("⚠️ Por favor permita las ventanas emergentes (pop-ups) para ver el PDF.");
      }



      // 4. Generate Base64 for Archive/Email (Background)
      const pdfBase64 = pdf.output('datauristring');

      // 2. ARCHIVE TO SERVER (So it's saved with date/time)
      if (btn) btn.textContent = '📦 ARCHIVANDO...';
      try {
        await fetch(`${API_BASE}/spool/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: pdfBase64,
            itemsCount: ticketSpool.length
          })
        });
      } catch (e) { console.error("Archive error:", e); }

      // 3. SILENT EMAIL (Background)
      if (btn) btn.textContent = '📨 SINCRONIZANDO...';
      try {
        await fetch(`${API_BASE}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: pdfBase64,
            filename: finalFileName,
            targetEmail: 'slwforever143@gmail.com'
          })
        });
      } catch (e) { console.error("Silent email error:", e); }

      // Result Logic
      alert(`✅ PDF "${finalFileName}" generado.\n\nSe ha abierto en una nueva pestaña para IMPRIMIR.`);

      // Final Cleanup (Clear active spool, but History remains on server)
      if (!skipDelete) {
        await fetch(`${API_BASE}/spool`, { method: 'DELETE' });
        fetchData();
      }
      setTicketSpoolPage(0);
      setPrintingSpool(null);
      if (btn) btn.textContent = originalText;

    } catch (err) {
      console.error('PDF Catch:', err);
      if (btn) btn.textContent = originalText;
      setPrintingSpool(null);
      alert("❌ ERROR CRÍTICO al generar PDF: " + err.message);
    }
  };

  const addToSpool = async (product) => {
    try {
      const res = await fetch(`${API_BASE}/spool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (res.ok) {
        fetchData(); // Refresh global spool
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch (e) { console.error('Error adding to spool:', e); }
  };

  const addMultipleToSpool = async (items) => {
    try {
      const res = await fetch(`${API_BASE}/spool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });
      if (res.ok) {
        fetchData();
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch (e) { console.error('Error adding multiple to spool:', e); }
  };

  const clearSpool = async () => {
    try {
      await fetch(`${API_BASE}/spool`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateSpool = async (newSpool) => {
    try {
      // For general updates (bulk)
      await fetch(`${API_BASE}/spool`, { method: 'DELETE' });
      const res = await fetch(`${API_BASE}/spool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSpool)
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const removeFromSpool = async (id) => {
    try {
      // Optimistic state update for local performance
      setTicketSpool(prev => prev.filter(item => item.id !== id));
      
      const res = await fetch(`${API_BASE}/spool/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  // --- COMMONS ---




  if (showSplash) {
    return (
      <div className="splash-screen">
        <img src={logo} alt="Carrefour" className="splash-logo animate-logo-special" />
        <div className="splash-text-container">
          <h1 className="splash-brand slide-in-left"><span className="blue">Carrefour</span> <span className="express red">express</span></h1>
          <p className="splash-addr fade-in-up">RONDA DE OUTEIRO 112</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-container light`}>
      {/* INACTIVITY DIMMER OVERLAY */}
      {isDimmed && (
        <div className="inactivity-dimmer" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 999999, pointerEvents: 'none',
          transition: 'opacity 2s ease-in-out'
        }} />
      )}
      {/* ⚪ CHERPA BLANK OVERRIDE ⚪ */}
      <div id="pdf-hidden-generator" style={{ position: 'fixed', top: '-5000px', left: '-5000px', pointerEvents: 'none' }}>
        <div id="a4-canvas" className={`a4-sheet-container ${ticketOrientation} ${(printingSpool || ticketSpool).every(i => i?.is_bandeja == 1 || i?.isBandeja) ? 'carne-no-margin' : ''}`}>
          <div className={(printingSpool || ticketSpool).every(i => i?.is_bandeja == 1 || i?.isBandeja) ? "a4-grid-20 carne-grid" : "a4-grid-20"}>
            {Array.from({ length: (printingSpool || ticketSpool).some(i => i?.is_bandeja == 1 || i?.isBandeja) && !(printingSpool || ticketSpool).some(i => !(i?.is_bandeja == 1 || i?.isBandeja)) ? 30 : 20 }).map((_, index) => {
              const pageSize = (printingSpool || ticketSpool).some(i => i?.is_bandeja == 1 || i?.isBandeja) && !(printingSpool || ticketSpool).some(i => !(i?.is_bandeja == 1 || i?.isBandeja)) ? 30 : 20;
              const actualIndex = (ticketSpoolPage * pageSize) + index;
              const sourceSpool = printingSpool || ticketSpool;
              const item = sourceSpool[actualIndex];
              return (
                <div key={index} className={`ticket-cell ${(item?.is_bandeja == 1 || item?.isBandeja) ? 'carne-cell' : ''}`}>
                  {item ? (
                    <>
                      {item.is_bandeja == 1 || item.isBandeja ? (
                        <div className="ticket-carne-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.4mm', boxSizing: 'border-box' }}>
                          {/* Top Section: Compact 9mm instead of 10mm */}
                          <div className="tc-top-row" style={{ display: 'flex', gap: '2px', height: '9mm', marginBottom: '1mm' }}>
                            <div className="tc-box-small" style={{ flex: 1, border: '0.45pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '4.5pt', fontWeight: '800' }}>PRECIO €/kg</span>
                              <span style={{ fontSize: '8.5pt', fontWeight: '950' }}>{parseFloat(item.price_kilo || 0).toFixed(2)}</span>
                            </div>
                            <div className="tc-box-small" style={{ flex: 1, border: '0.45pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '4.5pt', fontWeight: '800' }}>PESO (kg)</span>
                              <span style={{ fontSize: '8.5pt', fontWeight: '950' }}>{parseFloat(item.weight || 0).toFixed(3)}</span>
                            </div>
                          </div>

                          {/* Bottom Section: Compact 14mm */}
                          <div style={{ display: 'flex', height: '14mm', gap: '3px', alignItems: 'center' }}>
                            {/* Left: Price Box - 11mm instead of 12mm */}
                            <div className="tc-big-pvp-box" style={{ flex: 1.1, height: '11mm', border: '0.45pt solid black', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '0 1px' }}>
                              <span style={{ fontSize: '7pt', fontWeight: '950' }}>PVP €</span>
                              <span style={{ fontSize: '22pt', fontWeight: '950', letterSpacing: '-1.5px' }}>
                                {parseFloat(item.sell_price || 0).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            {/* Right: Barcode Area - 11mm */}
                            <div style={{ flex: 1, height: '11mm', border: '0.45pt solid black', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', boxSizing: 'border-box', overflow: 'hidden', paddingLeft: '2.5mm' }}>
                              <Barcode value={generateCarneBarcode(item)} width={1.45} height={26} displayValue={false} margin={2} background="transparent" />
                              <div style={{ fontSize: '8pt', fontWeight: '400', marginTop: '-1px', width: '100%', textAlign: 'center', paddingRight: '2.5mm' }}>{generateCarneBarcode(item)}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="ticket-name-top">{item.name}</div>
                          <div className="ticket-body-placeholder">
                            <div className="ticket-price-area">
                              <span className="price-integer">{Math.floor(parseFloat(item.sell_price || 0))}</span>
                              <div className="price-decimal-box">
                                <span className="price-comma">,</span>
                                <span className="price-fraction">{(parseFloat(item.sell_price || 0) % 1).toFixed(2).substring(2)}</span>
                                <span className="price-currency">€</span>
                              </div>
                            </div>
                          </div>
                          <div className="ticket-footer">
                            <div className="ticket-barcode-container" style={{ flex: '0 0 auto' }}>
                              <Barcode value={item.barcode || '0000000000000'} width={2.95} height={44} displayValue={false} margin={0} background="transparent" />
                            </div>
                            <div className="ticket-info-right">
                              <div className="info-row-bold">{item.barcode}</div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {view === 'scan' && (
        <style>{`
          /* Total Hiding of Scrollbars */
          ::-webkit-scrollbar { display: none !important; width: 0 !important; }
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          
          .app-container::before { display: none !important; }
          .app-container { background: #FFFFFF !important; height: 100vh !important; overflow: hidden !important; }
          html, body { 
            overflow: hidden !important; 
            background: #FFFFFF !important; 
            height: 100vh !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* CRITICAL: KILL ALL PADDING FOR CHERPA IFRAME */
          .main-viewport { padding: 0 !important; height: 100vh !important; max-width: 100% !important; }
          .a4-sheet-container.carne-no-margin {
    padding: 3mm 3mm !important;
}
          .scan-content-wrapper-new { padding: 0 !important; margin: 0 !important; height: 100vh !important; }
          .content-area-full { padding: 0 !important; margin: 0 !important; height: 100vh !important; }
        `}</style>
      )}

      {isMobile && view !== 'scan' && (
        <style>{`
          .app-container, .landing-container, .scan-content-wrapper-new, .dashboard-container {
            height: auto !important;
            min-height: 100vh !important;
            overflow-y: visible !important;
            display: flex !important;
            flex-direction: column !important;
          }
          html, body {
            height: auto !important;
            overflow-y: auto !important;
            position: static !important;
          }
        `}</style>
      )}

      {/* LANDING SCREEN (MAIN MENU) */}
      {view === 'landing' && (
        <div className="landing-container">
          {/* Header removed for cleaner desktop/landing look */}

          <div className="landing-branding" style={{ marginTop: '20px' }}>
            <img src={logo} alt="Carrefour" className="landing-branding-logo" />
            <h1 className="landing-branding-title" style={{ marginTop: '10px' }}>
              <span className="blue">Carrefour</span> <span className="red">express</span>
            </h1>
            <p className="landing-branding-subtitle">SISTEMA INTEGRAL DE GESTIÓN</p>
          </div>

          <div className="landing-grid">
            <div className="landing-card card-1" onClick={() => setView('scan')}>
              <h3>1. Carrefour Cherpa</h3>
              <p>App Staff Mobile</p>
            </div>
            <div className="landing-card card-2" onClick={() => setView('dashboard')}>
              <h3>2. Back Office</h3>
              <p>Inventario & Consulta</p>
            </div>
            <div className={`landing-card card-3 ${isMobile ? 'mobile-restricted' : ''}`} onClick={() => setView('pos')}>
              <div className="mobile-status-badge">{isMobile ? '🖥️ SÓLO ESCRITORIO' : '✅ STOCK ACTIVE'}</div>
              <h3>3. POS Terminal {isMobile && '🚫'}</h3>
              <p>{isMobile ? '⚠️ Restringido en Móvil' : 'Punto de Venta'}</p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {view !== 'landing' && (
        <div className="content-area-full">
          {view === 'scan' && (
            <Header
              currentView={view}
              setView={setView}
              setCherpaSubPage={setCherpaSubPage}
              onAddProduct={() => {
                setLookupBarcode('');
                setShowAddModal(true);
              }}
            />
          )}
          <main className="main-viewport">

            {/* --- SCAN VIEW (Now Carrefour Cherpa) --- */}
            {view === 'scan' && (
              <CherpaView
                onBack={() => setView('landing')}
                products={products}
                addToSpool={addToSpool}
                clearSpool={clearSpool}
                updateSpool={updateSpool}
                removeFromSpool={removeFromSpool}
                ticketSpool={ticketSpool}
                setTicketSpool={setTicketSpool}
                onGeneratePDF={handleTestPDF}
                activeSubPage={cherpaSubPage}
                setActiveSubPage={setCherpaSubPage}
                onAddProduct={handleSaveProduct}
                onUpdateProduct={handleQuickUpdate}
                CameraScanner={CameraScanner}
                API_BASE={API_BASE}
                ticketHistory={ticketHistory}
                inputRef={inputRef}
              />
            )}


            {/* --- POS VIEW --- */}
            {
              view === 'pos' && (
                isMobile ? (
                  <div className="mobile-pos-lock">
                    <div className="lock-card">
                      <div className="lock-icon">🖥️</div>
                      <h2 className="lock-title">ACCESO RESTRINGIDO</h2>
                      <p className="lock-msg">
                        Esta sección del <strong>Terminal POS</strong> está configurada exclusivamente para su uso en ordenadores de escritorio.
                      </p>
                      <p className="lock-sub">
                        Por favor, conéctese desde un PC o portátil para procesar ventas.
                      </p>
                      <button className="lock-back-btn" onClick={() => setView('landing')}>
                        VOLVER AL MENÚ
                      </button>
                    </div>
                  </div>
                ) : (
                  <PosTerminal
                    products={products}
                    setView={setView}
                    API_BASE={API_BASE}
                    logo={logo}
                    fetchData={fetchData}
                    formatDuration={formatDuration}
                  />
                )
              )
            }

            {/* --- DASHBOARD --- */}
            {
              view === 'dashboard' && (
                <div className={`dashboard-container ${selectedKpi ? 'is-split' : ''}`}>
                  <div className="view-header-row">
                    <div className="h-left">
                      <button className="btn-action" onClick={() => {
                        if (selectedKpi) setSelectedKpi(null);
                        else setView('landing');
                      }}>
                        ← {selectedKpi ? 'DASHBOARD' : 'VOLVER'}
                      </button>
                    </div>

                    <div className="h-center desktop-only">
                      <h1>Dashboard Back Office</h1>
                    </div>

                    <div className="h-right">
                      <div className="header-add-box" onClick={() => setView('add')}>
                        <div className="add-icon">+</div>
                        <div className="add-text">PRODUCTO</div>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-layout-engine">
                    {/* LEFT SIDEBAR - 1.5 INCH */}
                    {selectedKpi && (
                      <div className="kpi-left-sidebar">
                        <div className="sidebar-kpi-heading">
                          <div className="sidebar-icon">
                            {DashboardIcons[selectedKpi] ? DashboardIcons[selectedKpi]() : <span>📊</span>}
                          </div>
                          <div className="sidebar-title">
                            {selectedKpi === 'a1' && 'Consulta'}
                            {selectedKpi === 'a2' && 'Inventario'}
                            {selectedKpi === 'a3' && 'Análisis'}
                            {selectedKpi === 'a4' && 'Alertas'}
                            {selectedKpi === 'a5' && 'Ajustes App'}
                            {selectedKpi === 'a6' && 'Ventas'}
                            {selectedKpi === 'a7' && 'Acciones'}
                            {selectedKpi === 'a8' && 'Reportes'}
                            {selectedKpi === 'a9' && 'Sync Live'}
                          </div>
                        </div>

                        {/* === SETTINGS NAVIGATION SUB-SECTIONS === */}
                        {selectedKpi === 'a5' && (
                          <div className="sidebar-sections" style={{ padding: '15px' }}>
                            <div style={{ background: 'rgba(51, 65, 85, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                              <div style={{ fontSize: '30px', marginBottom: '10px' }}>⚙️</div>
                              <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>CONFIGURACIÓN</h4>
                              <p style={{ fontSize: '10px', color: '#64748b', marginTop: '5px' }}>Opciones disponibles en la próxima versión.</p>
                            </div>
                          </div>
                        )}

                        {selectedKpi === 'a5' ? (
                          <div className="sidebar-sections" style={{ padding: '15px' }}>
                            <div style={{ background: 'rgba(51, 65, 85, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                              <div style={{ fontSize: '30px', marginBottom: '10px' }}>⚙️</div>
                              <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>CONFIGURACIÓN</h4>
                              <p style={{ fontSize: '10px', color: '#64748b', marginTop: '5px' }}>Opciones disponibles en la próxima versión.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="sidebar-sections">
                            {/* Placeholder for other KPIs */}
                          </div>
                        )}
                      </div>
                    )}

                    {/* RIGHT SIDE / MAIN AREA */}
                    <div className="main-display-area">
                      {!selectedKpi ? (
                        <div className="stats-grid">
                          {dashboardData && dashboardData.kpis && Object.entries(dashboardData.kpis).map(([key, kpi]) => (
                            <div
                              key={key}
                              className="kpi-card compact"
                              style={{ "--accent": kpi.color }}
                              onClick={() => setSelectedKpi(key)}
                            >
                              <div className="kpi-main-content">
                                <div className="kpi-icon-seal">
                                  {DashboardIcons[key] ? DashboardIcons[key]() : <span>?</span>}
                                </div>
                                <div className="kpis-dynamic-val" style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--accent)', marginTop: '5px' }}>
                                  {kpi.value || '0'}
                                </div>
                              </div>
                              <div className="kpi-label-footer">{kpi.label}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="full-detail-hub animate-slideIn">
                          {selectedKpi === 'a1' && (
                            <div className="cherpa-backoffice-module animate-pop">
                              <div className="module-header-modern">
                                <div className="header-info">
                                  <span className="module-tag">Buscador Universal</span>
                                  <h3 className="module-title">Consulta de Artículos</h3>
                                </div>
                                <button className="btn-mobile-bridge" onClick={() => setView('scan')}>
                                  Mobile View 📱
                                </button>
                              </div>

                              <div className="modern-search-bar compact">
                                <form onSubmit={handleLookup} className="search-form-flex" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <div className="input-with-icon" style={{ flex: 1, position: 'relative' }}>
                                    <span className="search-icon">🔍</span>
                                    <input
                                      ref={lookupInputRef}
                                      className="premium-lookup-input"
                                      placeholder="Escanear o nombre..."
                                      value={lookupBarcode}
                                      onChange={(e) => setLookupBarcode(e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      autoFocus
                                    />
                                  </div>

                                  <button type="submit" className="btn-modern-search">BUSCAR</button>
                                  <button
                                    type="button"
                                    className={`btn-cam-toggle ${scanMode === 'camera' ? 'active' : ''}`}
                                    onClick={() => setScanMode(scanMode === 'camera' ? 'manual' : 'camera')}
                                  >
                                    📷
                                  </button>
                                </form>
                              </div>

                              <div className="module-content-area compact">
                                {scanMode === 'camera' && !lookupResult && (
                                  <div className="scanner-preview-box mini">
                                    <CameraScanner onScan={(code) => { setLookupBarcode(code); setScanMode('manual'); handleLookup(null, code); }} />
                                  </div>
                                )}

                                {loading && (
                                  <div className="module-loader">
                                    <div className="spinner mini"></div>
                                  </div>
                                )}

                                {lookupResult && lookupResult !== 'no_found' && (
                                  <div className="ultra-compact-card animate-slideUp">
                                    <div className="main-row">
                                      <div className="left-info">
                                        <h2 className="u-name">{lookupResult.name}</h2>
                                        <code className="u-ean">{lookupResult.barcode}</code>
                                      </div>
                                      <div className="right-price">
                                        <span className="u-label">PRECIO</span>
                                        <div className="u-price">€{parseFloat(lookupResult.sell_price).toFixed(2)}</div>
                                      </div>
                                    </div>

                                    <div className="stats-row-compact">
                                      <div className="s-tile">
                                        <label>STOCK</label>
                                        <b className={lookupResult.stock_current <= 5 ? 'text-red' : ''}>{lookupResult.stock_current} uds</b>
                                      </div>
                                      <div className="s-tile">
                                        <label>COMPRA</label>
                                        <b>€{parseFloat(lookupResult.price_buy || 0).toFixed(2)}</b>
                                      </div>
                                      <div className="s-tile">
                                        <label>MARGEN</label>
                                        <b className="text-green">{lookupResult.price_buy > 0 ? (((lookupResult.sell_price - lookupResult.price_buy) / lookupResult.price_buy) * 100).toFixed(0) + '%' : '---'}</b>
                                      </div>
                                      <div className="s-tile">
                                        <label>OFERTA</label>
                                        <b className={lookupResult.offer > 0 ? 'text-red' : ''}>{lookupResult.offer}%</b>
                                      </div>
                                    </div>

                                    <div className="actions-row-compact">
                                      <button
                                        className={`u-btn spool spool-special ${lastAddedId === lookupResult.id ? 'added-success' : ''}`}
                                        onClick={() => {
                                          addToSpool(lookupResult);
                                          setLastAddedId(lookupResult.id);
                                          setShowToast(true);
                                          setTimeout(() => {
                                            setShowToast(false);
                                            setLastAddedId(null);
                                          }, 2000);
                                        }}
                                      >
                                        {lastAddedId === lookupResult.id && <span className="btn-feedback-float">✅</span>}
                                        🎫 TICKET
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {lookupResult === 'no_found' && (
                                  <div className="module-error-card mini animate-shake">
                                    <h4>⚠️ NO ENCONTRADO</h4>
                                    <button onClick={() => setView('add')}>+ CREAR</button>
                                  </div>
                                )}

                                {!lookupResult && !loading && (
                                  <div className="module-idle mini">
                                    <div className="idle-animation mini">🔍</div>
                                    <h4>LISTO</h4>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {selectedKpi === 'a2' && (
                            <div className="stock-list-mini-view animate-pop">
                              <div className="mini-view-header glass-header" style={{ padding: '20px', borderRadius: '20px 20px 0 0', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #ddd', marginBottom: '0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '900px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <h3 style={{ margin: 0, color: '#003986', fontSize: '1.4rem', fontWeight: '950', letterSpacing: '-0.5px' }}>📦 STOCK MASTER</h3>
                                    <span className="premium-badge" style={{ background: '#E1000F', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '900' }}>TOTAL: {totalProducts}</span>
                                  </div>

                                  {/* STYLISH GLASS SEARCH BAR */}
                                  <div className="premium-search-container" style={{ position: 'relative', width: '100%', marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                      <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', opacity: 0.5 }}>🔍</span>
                                      <input
                                        type="text"
                                        placeholder="Scan o busca por nombre..."
                                        value={productSearch}
                                        onChange={(e) => {
                                          setProductSearch(e.target.value);
                                          setCurrentProductPage(1);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '16px 45px 16px 50px',
                                          borderRadius: '18px',
                                          border: '1px solid rgba(0, 57, 134, 0.2)',
                                          background: 'rgba(255,255,255,0.9)',
                                          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                                          fontSize: '15px',
                                          fontWeight: '600',
                                          transition: 'all 0.3s ease',
                                          color: '#003986'
                                        }}
                                        className="glass-input-glow"
                                      />
                                      {productSearch && (
                                        <button 
                                          onClick={() => setProductSearch('')}
                                          style={{
                                            position: 'absolute',
                                            right: '15px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: '#f1f5f9',
                                            border: 'none',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: '900',
                                            color: '#64748b',
                                            cursor: 'pointer'
                                          }}
                                        >×</button>
                                      )}
                                    </div>

                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <button
                                    className="btn-primary-premium"
                                    onClick={() => setView('add')}
                                    style={{
                                      background: 'linear-gradient(135deg, #003986, #0056b3)',
                                      color: 'white',
                                      border: 'none',
                                      padding: '12px 25px',
                                      borderRadius: '15px',
                                      fontWeight: '900',
                                      fontSize: '13px',
                                      boxShadow: '0 5px 15px rgba(0, 57, 134, 0.3)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    + NUEVO PRODUCTO
                                  </button>
                                </div>
                              </div>

                              <div className="mini-table-container">
                                <table className="mini-table">
                                  <thead>
                                    <tr>
                                      <th>PRODUCTO</th>
                                      <th>CÓDIGO</th>
                                      <th>PRECIO</th>
                                      <th>STOCK</th>
                                      <th>ACCIONES</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {products.length > 0 ? products.map((p, pIdx) => (
                                      <tr key={p.id}>
                                        <td className="p-name-cell">
                                          {highlightText(p.name, productSearch)}
                                          {pIdx < 3 && !productSearch && <span style={{ marginLeft: '10px', background: '#FFD700', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '900' }}>NEW</span>}
                                        </td>
                                        <td className="p-code-cell">{highlightText(p.barcode, productSearch)}</td>
                                        <td>€{parseFloat(p.sell_price).toFixed(2)}</td>
                                        <td>
                                          <span className={`mini-stock-badge ${p.stock_current < 10 ? 'low' : ''}`}>
                                            {p.stock_current}
                                          </span>
                                        </td>
                                        <td>
                                          <div className="mini-actions">
                                            <button
                                              className={`btn-mini spool-special ${lastAddedId === p.id ? 'added-success' : ''}`}
                                              style={{ width: '40px', height: '40px' }}
                                              title="Generar Ticket"
                                              onClick={(e) => {
                                                addToSpool(p);
                                                setLastAddedId(p.id);
                                                setShowToast(true);
                                                setTimeout(() => {
                                                  setShowToast(false);
                                                  setLastAddedId(null);
                                                }, 2000);
                                              }}
                                            >
                                              {lastAddedId === p.id && <span className="btn-feedback-float">✅</span>}
                                              🎫
                                            </button>
                                            <button className="btn-mini edit" onClick={() => setEditingProduct(p)}>✎</button>
                                            <button className="btn-mini report" onClick={() => setReportProduct(p)}>📈</button>
                                            <button className="btn-mini delete" onClick={() => handleDeleteProduct(p.id)}>×</button>
                                          </div>
                                        </td>
                                      </tr>
                                    )) : (
                                      <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '100px 20px', background: '#f8fafc' }}>
                                          <div style={{ fontSize: '50px', marginBottom: '20px' }}>🔍</div>
                                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#003986' }}>NO SE ENCONTRARON PRODUCTOS</div>
                                          <p style={{ color: '#64748b', fontWeight: '700', marginTop: '10px' }}>No hay resultados que coincidan con "{productSearch}"</p>
                                          <button 
                                            onClick={() => setView('add')}
                                            style={{ 
                                              marginTop: '25px', 
                                              background: '#E1000F', 
                                              color: 'white', 
                                              border: 'none', 
                                              padding: '12px 30px', 
                                              borderRadius: '12px', 
                                              fontWeight: '950',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            + CREAR NUEVO PRODUCTO
                                          </button>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* PIE DE TABLA - LOAD MORE BUTTON */}
                              {products.length < totalProducts && (
                                <div className="mini-view-footer" style={{ marginTop: '0', background: 'rgba(255,255,255,0.7)', padding: '25px', textAlign: 'center', borderRadius: '0 0 20px 20px', borderTop: '1px dashed rgba(0, 0, 0, 0.1)' }}>
                                  <button
                                    className="btn-load-more"
                                    onClick={() => setCurrentProductPage(p => p + 1)}
                                    style={{
                                      background: 'white',
                                      color: '#003986',
                                      border: '2px solid #003986',
                                      padding: '15px 40px',
                                      borderRadius: '40px',
                                      fontWeight: '950',
                                      fontSize: '15px',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#003986'; e.currentTarget.style.color = 'white'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#003986'; }}
                                  >
                                    ➕ MOSTRAR MÁS PRODUCTOS (SIGUIENTES 50)
                                  </button>
                                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#666', fontWeight: '700' }}>
                                    Mostrando {products.length} de {totalProducts} resultados
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedKpi === 'a3' && (
                            <div className="analysis-view animate-pop" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <div className="mini-view-header" style={{ marginBottom: '20px' }}>
                                <h3>📈 ANÁLISIS Y TENDENCIAS</h3>
                              </div>
                              <div style={{ flex: 1, display: 'flex', gap: '20px', flexDirection: 'column' }}>
                                {/* Chart 1 */}
                                <div style={{ background: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1 }}>
                                  <h4 style={{ color: '#003986', marginBottom: '15px', fontSize: '1.2rem', fontWeight: '900' }}>Ventas de la Última Semana (€)</h4>
                                  <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={[
                                      { name: 'Lun', ventas: 420 },
                                      { name: 'Mar', ventas: 380 },
                                      { name: 'Mié', ventas: 510 },
                                      { name: 'Jue', ventas: 460 },
                                      { name: 'Vie', ventas: 680 },
                                      { name: 'Sáb', ventas: 890 },
                                      { name: 'Dom', ventas: 740 },
                                    ]}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                                      <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `€${val}`} />
                                      <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
                                      <Area type="monotone" dataKey="ventas" stroke="#E1000F" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                                      <defs>
                                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#E1000F" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="#E1000F" stopOpacity={0} />
                                        </linearGradient>
                                      </defs>
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>

                                {/* Chart 2 */}
                                <div style={{ background: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1 }}>
                                  <h4 style={{ color: '#003986', marginBottom: '15px', fontSize: '1.2rem', fontWeight: '900' }}>Rendimiento por Categorías (Top)</h4>
                                  <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={[
                                      { name: 'Bebidas', valor: 850 },
                                      { name: 'Panadería', valor: 620 },
                                      { name: 'Lácteos', valor: 540 },
                                      { name: 'Snacks', valor: 490 },
                                      { name: 'Limpieza', valor: 380 },
                                    ]}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                                      <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
                                      <Bar dataKey="valor" fill="#003986" radius={[8, 8, 0, 0]} barSize={40} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* === SETTINGS VIEW (a5) === */}
                          {selectedKpi === 'a5' && (
                            <div className="future-module-placeholder animate-pop" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <div className="module-header-modern">
                                <div className="header-info">
                                  <span className="module-tag">Área Registrada</span>
                                  <h3 className="module-title">⚙️ CONFIGURACIÓN Y AJUSTES</h3>
                                </div>
                              </div>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '20px', marginTop: '20px', border: '2px dashed #e2e8f0' }}>
                                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
                                  <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚧</div>
                                  <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', marginBottom: '10px' }}>PRÓXIMAMENTE</h2>
                                  <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
                                    Este módulo está reservado para futuras actualizaciones del sistema, configuraciones de usuario y ajustes avanzados.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedKpi === 'a6' && (
                            <div className="sales-history-view animate-pop">
                              <div className="mini-view-header">
                                <h3>💰 HISTORIAL DE VENTAS (VENTAS)</h3>
                              </div>
                              <div className="mini-table-container">
                                <table className="mini-table">
                                  <thead>
                                    <tr>
                                      <th>FECHA</th>
                                      <th>HORA</th>
                                      <th>ART ÍCULOS</th>
                                      <th>TOTAL</th>
                                      <th>ACCIÓN</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sales.map(s => (
                                      <tr key={s.id}>
                                        <td>{new Date(s.timestamp).toLocaleDateString()}</td>
                                        <td>{new Date(s.timestamp).toLocaleTimeString()}</td>
                                        <td>{Array.isArray(s.items) ? s.items.length : s.items_count}</td>
                                        <td className="bold">€{parseFloat(s.total).toFixed(2)}</td>
                                        <td><button className="btn-mini" onClick={() => alert('Detalle de venta no disponible')}>👁️</button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {selectedKpi === 'a8' && (
                            <div className="reports-view animate-pop">
                              <div className="mini-view-header">
                                <h3>📊 INFORMES ESTRATÉGICOS</h3>
                              </div>
                              <div className="reports-stats-grid">
                                <div className="report-stat-card">
                                  <label>INGRESOS TOTALES</label>
                                  <div className="val">€{reportSummary.total_revenue.toFixed(2)}</div>
                                </div>
                                <div className="report-stat-card">
                                  <label>PEDIDOS TOTALES</label>
                                  <div className="val">{reportSummary.total_orders}</div>
                                </div>
                                <div className="report-stat-card">
                                  <label>TICKET PROMEDIO</label>
                                  <div className="val">€{(reportSummary.total_revenue / (reportSummary.total_orders || 1)).toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedKpi === 'a9' && (
                            <SyncView API_BASE={API_BASE} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            {/* SMALL FLOATING ADD MODAL */}
            {
              showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                  <div className="small-add-modal-compact animate-pop" onClick={e => e.stopPropagation()}>
                    <div className="modal-header-mini">
                      <h3>➕ NUEVO PRODUCTO</h3>
                      <button
                        className="btn-camera-modal"
                        onClick={() => setScanMode(scanMode === 'camera' ? 'manual' : 'camera')}
                        style={{ border: 'none', background: '#f0f0f0', padding: '5px 10px', borderRadius: '10px', cursor: 'pointer' }}
                      >
                        {scanMode === 'camera' ? '🚫 Parar' : '📷 Scan'}
                      </button>
                      <button className="close-x-btn" onClick={() => { setShowAddModal(false); setScanMode('manual'); }}>×</button>
                    </div>

                    {scanMode === 'camera' && (
                      <div className="modal-camera-box" style={{ width: '100%', height: '180px', overflow: 'hidden', borderRadius: '15px', marginBottom: '15px' }}>
                        <CameraScanner onScan={(code) => {
                          const barcodeInput = document.querySelector('input[name="barcode"]');
                          if (barcodeInput) {
                            barcodeInput.value = code;
                            setScanMode('manual');
                            // Check if product already exists to warn user
                            const existing = products.find(p => p.barcode === code);
                            if (existing) alert("⚠️ Este producto ya existe: " + existing.name);
                          }
                        }} />
                      </div>
                    )}

                    <form className="carrefour-form-compact" onSubmit={handleSaveProduct}>
                      {/* Barcode - Full Width */}
                      <div className="input-group-compact">
                        <label>📦 Código EAN</label>
                        <input
                          name="barcode"
                          defaultValue={lookupBarcode || ''}
                          placeholder="8480000..."
                          required
                          autoFocus
                          className="input-compact"
                        />
                      </div>

                      {/* Product Name - Full Width */}
                      <div className="input-group-compact">
                        <label>🏷️ Nombre</label>
                        <input
                          name="name"
                          placeholder="Ej: COCA COLA 2L"
                          required
                          maxLength="28"
                          className="input-compact"
                          onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                        />
                      </div>

                      {/* Price Row - Compra, Venta, Margin */}
                      <div className="input-row-triple">
                        <div className="input-group-compact">
                          <label>💰 Compra</label>
                          <input
                            name="price_buy"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            required
                            className="input-compact"
                            onChange={(e) => {
                              const v = e.target.value.replace(',', '.');
                              if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                              e.target.value = v;
                              const buyPrice = parseFloat(v) || 0;
                              const sellPrice = parseFloat(e.target.form.price_sell.value) || 0;
                              if (buyPrice > 0 && sellPrice > 0) {
                                const margin = ((sellPrice - buyPrice) / buyPrice * 100).toFixed(1);
                                e.target.form.margin_display.value = margin + '%';
                              }
                            }}
                          />
                        </div>
                        <div className="input-group-compact">
                          <label>💵 Venta</label>
                          <input
                            name="price_sell"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            required
                            className="input-compact"
                            onChange={(e) => {
                              const v = e.target.value.replace(',', '.');
                              if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                              e.target.value = v;
                              const sellPrice = parseFloat(v) || 0;
                              const buyPrice = parseFloat(e.target.form.price_buy.value) || 0;
                              if (buyPrice > 0 && sellPrice > 0) {
                                const margin = ((sellPrice - buyPrice) / buyPrice * 100).toFixed(1);
                                e.target.form.margin_display.value = margin + '%';
                              }
                            }}
                          />
                        </div>
                        <div className="input-group-compact">
                          <label>📊 Margen</label>
                          <input
                            name="margin_display"
                            type="text"
                            placeholder="0%"
                            readOnly
                            className="input-compact margin-display"
                          />
                        </div>
                      </div>

                      {/* Stock & Offer Row */}
                      <div className="input-row-dual">
                        <div className="input-group-compact">
                          <label>📦 Stock</label>
                          <input name="stock" type="text" inputMode="numeric" placeholder="Cant." required className="input-compact" />
                        </div>
                        <div className="input-group-compact">
                          <label>🎁 Oferta</label>
                          <select name="offer" className="input-compact">
                            <option value="0">Sin Oferta</option>
                            <option value="50">2ª -50%</option>
                            <option value="70">2ª -70%</option>
                          </select>
                        </div>
                      </div>

                      {/* Expiry Date - Full Width */}
                      <div className="input-group-compact">
                        <label>📅 Caducidad (Opcional)</label>
                        <input name="expiry" type="date" className="input-compact" />
                      </div>

                      <button type="submit" className="btn-submit-compact">
                        ✅ GUARDAR PRODUCTO
                      </button>
                    </form>
                  </div>
                </div>
              )
            }



            {/* EDIT PRODUCT MODAL */}
            {
              editingProduct && (
                <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
                  <div className="small-add-modal-compact animate-pop" onClick={e => e.stopPropagation()}>
                    <div className="modal-header-mini">
                      <h3>📝 EDITAR PRODUCTO</h3>
                      <button className="close-x-btn" onClick={() => setEditingProduct(null)}>×</button>
                    </div>

                    <form className="carrefour-form-compact" onSubmit={handleUpdateProduct}>
                      {/* Barcode - Full Width */}
                      <div className="input-group-compact">
                        <label>📦 Código EAN</label>
                        <input
                          name="barcode"
                          defaultValue={editingProduct.barcode}
                          required
                          className="input-compact"
                        />
                      </div>

                      <div className="input-group-compact">
                        <label>🏷️ Nombre</label>
                        <input
                          name="name"
                          defaultValue={editingProduct.name}
                          required
                          maxLength="28"
                          className="input-compact"
                          onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                        />
                      </div>

                      {/* Price Row - Compra, Venta, Margin */}
                      <div className="input-row-triple">
                        <div className="input-group-compact">
                          <label>💰 Compra</label>
                          <input
                            name="price_buy"
                            type="text"
                            inputMode="decimal"
                            defaultValue={editingProduct.price_buy}
                            required
                            className="input-compact"
                            onChange={(e) => {
                              const v = e.target.value.replace(',', '.');
                              if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                              e.target.value = v;
                              const buyPrice = parseFloat(v) || 0;
                              const sellPrice = parseFloat(e.target.form.price_sell.value) || 0;
                              if (buyPrice > 0 && sellPrice > 0) {
                                const margin = ((sellPrice - buyPrice) / buyPrice * 100).toFixed(1);
                                e.target.form.margin_display.value = margin + '%';
                              }
                            }}
                          />
                        </div>
                        <div className="input-group-compact">
                          <label>💵 Venta</label>
                          <input
                            name="price_sell"
                            type="text"
                            inputMode="decimal"
                            defaultValue={editingProduct.sell_price}
                            required
                            className="input-compact"
                            onChange={(e) => {
                              const v = e.target.value.replace(',', '.');
                              if (v !== '' && !/^[0-9]*\.?[0-9]*$/.test(v)) return;
                              e.target.value = v;
                              const sellPrice = parseFloat(v) || 0;
                              const buyPrice = parseFloat(e.target.form.price_buy.value) || 0;
                              if (buyPrice > 0 && sellPrice > 0) {
                                const margin = ((sellPrice - buyPrice) / buyPrice * 100).toFixed(1);
                                e.target.form.margin_display.value = margin + '%';
                              }
                            }}
                          />
                        </div>
                        <div className="input-group-compact">
                          <label>📊 Margen</label>
                          <input
                            name="margin_display"
                            type="text"
                            defaultValue={editingProduct.price_buy > 0 ? (((editingProduct.sell_price - editingProduct.price_buy) / editingProduct.price_buy) * 100).toFixed(1) + '%' : '0%'}
                            readOnly
                            className="input-compact margin-display"
                          />
                        </div>
                      </div>

                      {/* Stock & Offer Row */}
                      <div className="input-row-dual">
                        <div className="input-group-compact">
                          <label>📦 Stock</label>
                          <input
                            name="stock"
                            type="text"
                            inputMode="numeric"
                            defaultValue={editingProduct.stock_current}
                            required
                            className="input-compact"
                          />
                        </div>
                        <div className="input-group-compact">
                          <label>🎁 Oferta</label>
                          <select name="offer" className="input-compact" defaultValue={editingProduct.offer}>
                            <option value="0">Sin Oferta</option>
                            <option value="50">2ª -50%</option>
                            <option value="70">2ª -70%</option>
                          </select>
                        </div>
                      </div>

                      {/* Expiry Date - Full Width */}
                      <div className="input-group-compact">
                        <label>📅 Caducidad</label>
                        <input
                          name="expiry"
                          type="date"
                          defaultValue={editingProduct.expiry ? editingProduct.expiry.split('T')[0] : ''}
                          className="input-compact"
                        />
                      </div>

                      <button type="submit" className="btn-submit-compact" style={{ background: '#003986' }}>
                        ✅ ACTUALIZAR PRODUCTO
                      </button>
                    </form>
                  </div>
                </div>
              )
            }

            {/* PRODUCT REPORT MODAL */}
            {
              reportProduct && (
                <div className="modal-overlay" onClick={() => setReportProduct(null)}>
                  <div className="report-modal animate-slideIn" onClick={e => e.stopPropagation()}>
                    <div className="report-header">
                      <div className="r-title">
                        <h2>{reportProduct.name}</h2>
                        <span>Reporte Detallado de Rendimiento</span>
                      </div>
                      <button className="btn-close-report" onClick={() => setReportProduct(null)}>×</button>
                    </div>

                    <div className="report-content">
                      <div className="price-prominent-badge-report" style={{
                        background: 'var(--carrefour-blue)',
                        color: 'white',
                        padding: '30px',
                        borderRadius: '25px',
                        textAlign: 'center',
                        marginBottom: '30px',
                        boxShadow: '0 10px 30px rgba(0, 57, 134, 0.2)'
                      }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', opacity: 0.9, letterSpacing: '2px', display: 'block', marginBottom: '10px' }}>PRECIO VENTA</span>
                        <span style={{ fontSize: '4.5rem', fontWeight: '950', display: 'block', lineHeight: 1 }}>€{parseFloat(reportProduct.sell_price).toFixed(2)}</span>
                      </div>

                      <div className="r-stats-grid">
                        <div className="r-stat-card">
                          <span className="rs-label">BENEFICIO POR UNIDAD</span>
                          <span className="rs-val green">€{(parseFloat(reportProduct.sell_price) - parseFloat(reportProduct.price_buy || 0)).toFixed(2)}</span>
                        </div>
                        <div className="r-stat-card">
                          <span className="rs-label">MARGEN DE VENTA</span>
                          <span className="rs-val blue">{Math.round(((parseFloat(reportProduct.sell_price) - parseFloat(reportProduct.price_buy || 0)) / parseFloat(reportProduct.sell_price)) * 100)}%</span>
                        </div>
                        <div className="r-stat-card">
                          <span className="rs-label">EXPIRACIÓN</span>
                          <span className="rs-val red">{reportProduct.expiry || 'No Definida'}</span>
                        </div>
                      </div>

                      <div className="r-details-list">
                        <div className="r-detail-item"><strong>Barcode:</strong> <span>{reportProduct.barcode}</span></div>
                        <div className="r-detail-item"><strong>Stock Actual:</strong> <span>{reportProduct.stock_current} unidades</span></div>
                        <div className="r-detail-item"><strong>Precio Compra:</strong> <span>€{parseFloat(reportProduct.price_buy || 0).toFixed(2)}</span></div>
                        <div className="r-detail-item"><strong>Precio Venta:</strong> <span>€{parseFloat(reportProduct.sell_price).toFixed(2)}</span></div>
                        <div className="r-detail-item"><strong>Promoción Activa:</strong> <span>{reportProduct.offer > 0 ? `2ª Unidad -${reportProduct.offer}%` : 'Ninguna'}</span></div>
                      </div>

                      <div className="r-footer-hint">
                        <p>* Los datos de beneficio son calculados en base al stock actual y precios configurados.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            {/* SPOOL REQUEST MODAL */}
            {
              showSpoolModal && (
                <div className="modal-overlay" onClick={() => setShowSpoolModal(false)}>
                  <div className="small-add-modal animate-pop" onClick={e => e.stopPropagation()}>
                    <div className="modal-header-mini">
                      <h3>➕ SOLICITAR TICKET</h3>
                      <button className="close-x-btn" onClick={() => setShowSpoolModal(false)}>×</button>
                    </div>

                    <div className="spool-modal-body" style={{ padding: '20px' }}>
                      {!spoolFoundProduct ? (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const p = products.find(prod => prod.barcode === spoolSearchBarcode);
                          if (p) {
                            setSpoolFoundProduct(p);
                          } else {
                            alert('Producto no encontrado');
                          }
                        }}>
                          <div className="input-group">
                            <label>ESCANEAR BARCODE O ESCRIBIR:</label>
                            <input
                              value={spoolSearchBarcode}
                              onChange={(e) => setSpoolSearchBarcode(e.target.value)}
                              className="carrefour-input"
                              placeholder="Escanear producto..."
                              style={{ color: 'black', fontWeight: 'bold' }}
                              autoFocus
                            />
                          </div>
                          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>BUSCAR PRODUCTO</button>
                        </form>
                      ) : (
                        <div className="spool-found-product">
                          <div className="found-p-card" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #003986' }}>
                            <h3 style={{ margin: '0 0 5px 0', color: '#003986' }}>{spoolFoundProduct.name}</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Barcode: <strong>{spoolFoundProduct.barcode}</strong></span>
                              <span>Precio: <strong>€{parseFloat(spoolFoundProduct.sell_price).toFixed(2)}</strong></span>
                            </div>
                          </div>

                          <div className="input-group">
                            <label>¿CUÁNTAS COPIAS?</label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={spoolQuantity}
                              onChange={(e) => setSpoolQuantity(parseInt(e.target.value) || 1)}
                              className="carrefour-input"
                              style={{
                                fontSize: '2.5rem',
                                textAlign: 'center',
                                color: '#003986',
                                background: '#ffffff',
                                border: '3px solid #003986',
                                borderRadius: '15px',
                                width: '100%',
                                fontWeight: '900',
                                marginTop: '10px'
                              }}
                              autoFocus
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  const copies = Array(spoolQuantity).fill(spoolFoundProduct);
                                  await addMultipleToSpool(copies);

                                  setShowSpoolModal(false);
                                  setSpoolFoundProduct(null);
                                  setSpoolSearchBarcode('');
                                  setSpoolQuantity(1);
                                }
                              }}
                            />
                          </div>

                          <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                              className="btn-action"
                              onClick={() => {
                                setSpoolFoundProduct(null);
                                setSpoolSearchBarcode('');
                                setTimeout(() => document.querySelector('.carrefour-input')?.focus(), 100);
                              }}
                            >
                              🔄 BUSCAR OTRO
                            </button>
                            <button
                              className="btn-primary"
                              style={{ flex: 1 }}
                              onClick={async () => {
                                const copies = Array(spoolQuantity).fill(spoolFoundProduct);
                                await addMultipleToSpool(copies);

                                setShowSpoolModal(false);
                                setSpoolFoundProduct(null);
                                setSpoolSearchBarcode('');
                                setSpoolQuantity(1);
                              }}
                            >
                              ✅ AÑADIR A SPOOL
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            }

            {/* --- INVENTORY --- */}
            {
              view === 'inventory' && (
                <div className="inventory-container">
                  <div className="view-header-row">
                    <button className="btn-action" onClick={() => setView('landing')}>← VOLVER</button>
                    <div className="h-center"><h1>Inventario</h1></div>
                    <button className="btn-action-add-new" onClick={() => setView('add')}>+ ADD</button>
                  </div>
                  <div className="table-card">
                    <table className="ob-table">
                      <thead><tr><th>Barcode</th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Status</th><th>Acciones</th></tr></thead>
                      <tbody>
                        {products.slice(0, 100).map(p => (
                          <tr key={p.id}>
                            <td style={{ fontFamily: 'monospace' }}>{p.barcode}</td>
                            <td>{p.name}</td>
                            <td>€{parseFloat(p.sell_price).toFixed(2)}</td>
                            <td>{p.stock_current}</td>
                            <td><span className={`status-pill ${p.stock_current > 10 ? 'ok' : 'low'}`}>{p.stock_current > 10 ? 'EN STOCK' : 'BAJO STOCK'}</span></td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className={`btn-table-action spool-special ${lastAddedId === p.id ? 'added-success' : ''}`}
                                  style={{ minWidth: '90px' }}
                                  title="Añadir a Spool"
                                  onClick={(e) => {
                                    addToSpool(p);
                                    setLastAddedId(p.id);
                                    setShowToast(true);
                                    setTimeout(() => {
                                      setShowToast(false);
                                      setLastAddedId(null);
                                    }, 2000);
                                  }}
                                >
                                  {lastAddedId === p.id && <span className="btn-feedback-float">✅</span>}
                                  🎫 Ticket
                                </button>
                                <button className="btn-table-action edit" onClick={() => setEditingProduct(p)}>Editar</button>
                                <button className="btn-table-action report" onClick={() => setReportProduct(p)}>Reporte</button>
                                <button className="btn-table-action delete" onClick={() => handleDeleteProduct(p.id)}>Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }

            {
              view === 'add' && (
                <div className="add-product-container">
                  <div className="view-header-row">
                    <button className="btn-action" onClick={() => setView('landing')}>← VOLVER</button>
                    <div className="h-center"><h1>Añadir Producto</h1></div>
                    <div style={{ width: '80px' }}></div>
                  </div>
                  <div className="form-card-classic animate-pop">
                    <form className="carrefour-form-compact" onSubmit={handleSaveProduct}>
                      {/* Barcode */}
                      <div className="input-group-compact">
                        <label>📦 CÓDIGO EAN</label>
                        <input name="barcode" placeholder="Escanear o escribir..." required autoFocus className="input-compact" autoComplete="off" />
                      </div>

                      {/* Name */}
                      <div className="input-group-compact">
                        <label>🏷️ NOMBRE DEL PRODUCTO</label>
                        <input name="name" placeholder="Ej: Coca Cola 2L" required className="input-compact" autoComplete="off" />
                      </div>

                      {/* Prices */}
                      <div className="input-row-triple">
                        <div className="input-group-compact">
                          <label>💰 COMPRA</label>
                          <input name="price_buy" type="number" step="0.01" className="input-compact" placeholder="0.00" onChange={(e) => {
                            const buy = parseFloat(e.target.value) || 0;
                            const sell = parseFloat(e.target.form.price_sell.value) || 0;
                            if (buy > 0 && sell > 0) e.target.form.margin_display.value = (((sell - buy) / buy) * 100).toFixed(1) + '%';
                          }} />
                        </div>
                        <div className="input-group-compact">
                          <label>💵 VENTA</label>
                          <input name="price_sell" type="number" step="0.01" className="input-compact" required placeholder="0.00" onChange={(e) => {
                            const sell = parseFloat(e.target.value) || 0;
                            const buy = parseFloat(e.target.form.price_buy.value) || 0;
                            if (buy > 0 && sell > 0) e.target.form.margin_display.value = (((sell - buy) / buy) * 100).toFixed(1) + '%';
                          }} />
                        </div>
                        <div className="input-group-compact">
                          <label>📊 MARGEN</label>
                          <input name="margin_display" readOnly className="input-compact" placeholder="0%" style={{ background: '#f8f9fa' }} />
                        </div>
                      </div>

                      {/* Stock & Offer */}
                      <div className="input-row-dual">
                        <div className="input-group-compact">
                          <label>📦 STOCK INICIAL</label>
                          <input name="stock" type="number" required className="input-compact" placeholder="Cant." />
                        </div>
                        <div className="input-group-compact">
                          <label>🎁 OFERTA %</label>
                          <input name="offer" type="number" className="input-compact" defaultValue="0" />
                        </div>
                      </div>

                      <div className="input-group-compact">
                        <label>📅 CADUCIDAD (OPCIONAL)</label>
                        <input name="expiry" type="date" className="input-compact" />
                      </div>

                      <button type="submit" className="btn-submit-compact">
                        ✅ GUARDAR PRODUCTO
                      </button>
                    </form>
                  </div>
                </div>
              )
            }

            {
              postSaveAction && (
                <div className="modal-overlay" style={{ zIndex: 30000 }}>
                  <div className="premium-alert-card animate-pop">
                    <div className="alert-header-success">
                      <span className="alert-icon-big">✅</span>
                      <h2>PRODUCTO GUARDADO</h2>
                    </div>
                    <div className="alert-body">
                      <p><strong>{postSaveAction.product.name}</strong> se ha guardado correctamente.</p>
                      <p className="sub-text">¿Quieres añadir tickets al Spool ahora?</p>

                      <div className="alert-qty-picker">
                        <label>CANTIDAD:</label>
                        <div className="picker-controls">
                          <button onClick={() => setPostSaveAction(prev => ({ ...prev, cantidad: Math.max(1, prev.cantidad - 1) }))}>-</button>
                          <span>{postSaveAction.cantidad}</span>
                          <button onClick={() => setPostSaveAction(prev => ({ ...prev, cantidad: prev.cantidad + 1 }))}>+</button>
                        </div>
                      </div>
                    </div>
                    <div className="alert-footer">
                      <button className="btn-alert-secondary" onClick={() => setPostSaveAction(null)}>Omitir</button>
                      <button className="btn-alert-primary" onClick={async () => {
                        try {
                          const copies = Array(postSaveAction.cantidad).fill(postSaveAction.product);
                          await fetch(`${API_BASE}/spool`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(copies)
                          });
                          fetchData();
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        } catch (err) { console.error('Error adding to Spool', err); }
                        setPostSaveAction(null);
                      }}>Añadir a Spool</button>
                    </div>
                  </div>
                </div>
              )
            }

            {
              showToast && (
                <div className="toast-notification animate-slideUp">
                  <span className="toast-icon">✅</span>
                  <span className="toast-text">¡Añadido al Spool!</span>
                </div>
              )
            }
            {
              error && (
                <div className="error-overlay" style={{
                  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                  background: 'rgba(255,255,255,0.9)', zIndex: 20000, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❌</div>
                  <h2 style={{ color: '#E1000F', fontWeight: '900', fontSize: '2rem' }}>{error}</h2>
                  <p style={{ margin: '20px 0', fontSize: '1.2rem', color: '#666' }}>
                    {error === 'Producto no encontrado' ? 'Este producto no está en el sistema.' : 'Ha ocurrido un error inesperado.'}
                  </p>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <button className="btn-action" onClick={() => setError('')} style={{ background: '#333', color: '#fff', padding: '15px 40px', borderRadius: '15px', fontSize: '1.1rem' }}>
                      CERRAR
                    </button>
                    {error === 'Producto no encontrado' && (
                      <button className="btn-primary" onClick={() => { setError(''); setView('add'); }} style={{ background: '#003986', color: '#fff', padding: '15px 40px', borderRadius: '15px', fontSize: '1.1rem' }}>
                        ➕ AÑADIR PRODUCTO
                      </button>
                    )}
                  </div>
                </div>
              )
            }
            {/* --- END SCAN VIEW --- */}
          </main >
          <div style={{ position: 'fixed', bottom: '5px', right: '5px', fontSize: '8px', color: '#ccc', pointerEvents: 'none' }}>v2.4</div>
        </div >
      )
      }
    </div >
  );
}

// --- SYNC VIEW COMPONENT ---
const SyncView = ({ API_BASE }) => {
  const [config, setConfig] = useState({ host: '', user: '', password: '', remoteDir: '/public_html' });
  const [logs, setLogs] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/deploy-config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(e => console.error('Error fetching config:', e));
  }, [API_BASE]);

  const handleSave = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/deploy-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.ok) alert('✅ Configuración guardada localmente');
  };

  const handleSync = async () => {
    setIsDeploying(true);
    setLogs(prev => ['🚀 Iniciando Proceso de Sincronización...', ...prev]);

    try {
      const res = await fetch(`${API_BASE}/deploy-to-live`, { method: 'POST' });
      const data = await res.json();

      if (data.logs) {
        setLogs(data.logs);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error desconocido del servidor');
      }

      setLogs(prev => [...prev, '✅ Sincronización finalizada correctamente']);
    } catch (e) {
      console.error(e);
      setLogs(prev => [...prev, `❌ ERROR: ${e.message}`]);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="sync-view animate-pop" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="mini-view-header" style={{ marginBottom: '20px' }}>
        <h3>☁️ SINCRONIZACIÓN CON HOSTINGER</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', flex: 1, paddingBottom: '30px' }}>
        <div style={{ background: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: 'fit-content' }}>
          <h4 style={{ color: '#003986', marginBottom: '15px' }}>CONFIGURACIÓN FTP</h4>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="input-group-compact">
              <label>Host / Servidor</label>
              <input
                value={config.host || ''}
                onChange={e => setConfig({ ...config, host: e.target.value })}
                placeholder="ftp.tudominio.com" required className="input-compact"
              />
            </div>
            <div className="input-group-compact">
              <label>Usuario FTP</label>
              <input
                value={config.user || ''}
                onChange={e => setConfig({ ...config, user: e.target.value })}
                placeholder="u12345678" required className="input-compact"
              />
            </div>
            <div className="input-group-compact">
              <label>Contraseña</label>
              <input
                type="password"
                value={config.password || ''}
                onChange={e => setConfig({ ...config, password: e.target.value })}
                placeholder="********" required className="input-compact"
              />
            </div>
            <div className="input-group-compact">
              <label>Carpeta Remota</label>
              <input
                value={config.remoteDir || '/public_html'}
                onChange={e => setConfig({ ...config, remoteDir: e.target.value })}
                className="input-compact"
              />
            </div>
            <button type="submit" className="btn-submit-compact" style={{ marginTop: '10px' }}>💾 GUARDAR CONFIG</button>
          </form>
        </div>

        <div style={{ background: '#000', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ color: '#0ea5e9' }}>CONSOLA DE DESPLIEGUE</h4>
            <button
              className="btn-primary-glow"
              style={{ padding: '8px 20px', background: isDeploying ? '#666' : '#0ea5e9', cursor: isDeploying ? 'not-allowed' : 'pointer' }}
              disabled={isDeploying}
              onClick={handleSync}
            >
              {isDeploying ? '⏳ SYNCING...' : '🚀 SYNC TO LIVE'}
            </button>
          </div>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '15px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            color: '#aaa',
            overflowY: 'auto'
          }}>
            {logs.length === 0 ? 'Esperando acción...' : logs.map((log, i) => (
              <div key={i} style={{ color: log.includes('✅') || log.includes('🎉') ? '#39FF14' : log.includes('❌') ? '#f43f5e' : '#aaa', marginBottom: '4px' }}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App

