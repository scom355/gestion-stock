import React, { useState, useRef, useEffect } from 'react';

const PosTerminal = ({ products, setView, API_BASE, logo, fetchData, formatDuration }) => {
    // --- POS States extracted from App.jsx ---
    const [posCart, setPosCart] = useState([]);
    const [posInput, setPosInput] = useState('');
    const [posQty, setPosQty] = useState(1);
    const [isSubtotalPressed, setIsSubtotalPressed] = useState(false);
    const [isMetalicoPressed, setIsMetalicoPressed] = useState(false);
    const [changeAmountDisplay, setChangeAmountDisplay] = useState(null);
    const [activeSubMenu, setActiveSubMenu] = useState(null);
    const [subMenuLevel, setSubMenuLevel] = useState(0);
    const [selectedSubMenuCat, setSelectedSubMenuCat] = useState(null);
    const [posError, setPosError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sessionStartTime] = useState(new Date());
    const [customerCount, setCustomerCount] = useState(1);
    const [avisarMenuOpen, setAvisarMenuOpen] = useState(false);
    const [isDescanso, setIsDescanso] = useState(false);

    // --- Retiradas States ---
    const [isRetiradaPressed, setIsRetiradaPressed] = useState(false);
    const [retiradaStep, setRetiradaStep] = useState(1); // 1: Amount, 2: Reason, 3: ID, 4: PIN
    const [tempRetirada, setTempRetirada] = useState({ amount: 0, reason: 'RECOGIDA', id: '', pin: '' });
    const [dailyWithdrawals, setDailyWithdrawals] = useState([]);
    const [descansoStep, setDescansoStep] = useState(0); // 0: idle, 1: ID, 2: PIN
    const [descansoStartTime, setDescansoStartTime] = useState(null);
    const [isScreenDimmed, setIsScreenDimmed] = useState(false);

    // --- Drawer & Consult States ---
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isConsultMode, setIsConsultMode] = useState(false);
    const [consultProduct, setConsultProduct] = useState(null);
    const [givenAmount, setGivenAmount] = useState(0);

    // --- Aparcar Ticket Confirm States ---
    const [isParkingConfirm, setIsParkingConfirm] = useState(false);
    const [pendingParkedCart, setPendingParkedCart] = useState(null);
    const [pendingParkedId, setPendingParkedId] = useState(null);

    const inputRef = useRef(null);
    const audioCtxRef = useRef(null);

    // --- Logic & Derived Values ---
    const cartTotal = posCart.reduce((acc, item) => acc + (parseFloat(item.sell_price) * item.qty), 0);

    const getSuggestedAmounts = (total) => {
        if (total === 0) return [];
        if (total <= 1) return [1, 5, 10];
        let suggestions = new Set();
        suggestions.add(Math.ceil(total));
        suggestions.add(Math.ceil(total / 5) * 5);
        suggestions.add(Math.ceil(total / 10) * 10);
        suggestions.add(Math.ceil(total / 20) * 20);
        suggestions.add(Math.ceil(total / 50) * 50);
        const standardNotes = [2, 5, 10, 20, 50, 100];
        standardNotes.forEach(note => {
            if (note >= total) suggestions.add(note);
        });
        return Array.from(suggestions)
            .filter(val => val >= total)
            .sort((a, b) => a - b)
            .slice(0, 3);
    };
    const suggestedCash = getSuggestedAmounts(cartTotal);

    // --- Timers & Focus ---
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const keepFocus = () => {
            if (inputRef.current && document.activeElement !== inputRef.current) {
                // Only focus if no modal/submenu is blocking or if scanner should be active
                if (inputRef.current.offsetParent !== null && !activeSubMenu) {
                    inputRef.current.focus();
                }
            }
        };
        const interval = setInterval(keepFocus, 300);
        return () => clearInterval(interval);
    }, [activeSubMenu]);

    useEffect(() => {
        if (posCart.length === 0) {
            setIsSubtotalPressed(false);
            setIsMetalicoPressed(false);
        }
    }, [posCart]);

    // --- Drawer Alarm (Buzzer every 3 seconds) ---
    useEffect(() => {
        let interval;
        if (isDrawerOpen) {
            interval = setInterval(() => {
                triggerError("⚠️ CAJA ABIERTA");
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isDrawerOpen]);

    // --- Functions ---
    const handlePrintParkedTicket = (parkId, items) => {
        const printWindow = window.open('', '_blank', 'width=300,height=600');
        const now = new Date();
        const html = `
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { 
                        font-family: 'Courier New', monospace; 
                        padding: 10px; 
                        width: 280px; 
                        font-size: 12px; 
                        line-height: 1.2; 
                        color: #000; 
                        text-align: center;
                    }
                    .header { font-weight: bold; font-size: 14px; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
                    .info { text-align: left; font-size: 11px; margin-bottom: 10px; }
                    .item-row { display: flex; justify-content: space-between; font-size: 11px; text-align: left; margin: 2px 0; }
                    .item-name { flex: 1; text-transform: uppercase; white-space: nowrap; overflow: hidden; }
                    .item-qty { width: 30px; text-align: right; }
                    .barcode-container { margin: 20px 0; border: 1px solid #000; padding: 10px; }
                    .barcode { font-size: 38px; font-family: 'Libre Barcode 39', cursive; margin: 5px 0; }
                    .details { font-weight: bold; font-size: 14px; }
                    .footer { margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; font-size: 10px; }
                </style>
                <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
            </head>
            <body>
                <div class="header">
                    CARREFOUR EXPRESS<br>
                    TICKET EN ESPERA (APARCADO)
                </div>
                
                <div class="info">
                    FECHA: ${now.toLocaleDateString()}<br>
                    HORA: ${now.toLocaleTimeString()}<br>
                    CAJERO: SOHAIL<br>
                    CAJA: T-01
                </div>

                <div style="border-bottom: 1px solid #000; margin-bottom: 5px; text-align: left; font-weight: bold; font-size: 10px;">
                    PRODUCTOS PENDIENTES:
                </div>
                ${items.map(item => `
                    <div class="item-row">
                        <span class="item-name">${item.name.substring(0, 20)}</span>
                        <span class="item-qty">x${item.qty}</span>
                    </div>
                `).join('')}

                <div class="barcode-container">
                    <div style="font-size: 10px; margin-bottom: 5px;">ESCANEÉ PARA CONTINUAR</div>
                    <div class="barcode">*${parkId}*</div>
                    <div class="details">${parkId}</div>
                </div>

                <div class="footer">
                    ESTE TICKET NO ES UN COMPROBANTE DE PAGO.<br>
                    POR FAVOR, ENTREGUE AL CAJERO PARA FINALIZAR.
                </div>

                <script>
                    window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleAparcarTicket = async () => {
        if (posCart.length === 0) {
            triggerError("CARRITO VACÍO");
            return;
        }
        setIsParkingConfirm(true);
    };

    const finalizeAparcarTicket = async () => {
        // Generate a unique 12-digit ID starting with 999
        const parkId = '999' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');

        try {
            const res = await fetch(`${API_BASE}/parked-sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parkId, cart_data: posCart })
            });
            const result = await res.json();
            if (result.success) {
                handlePrintParkedTicket(parkId, posCart);
                setPosCart([]);
                setPosInput('');
                setIsParkingConfirm(false);
                triggerError("TICKET APARCADO ✅");
            }
        } catch (err) {
            triggerError("ERROR AL APARCAR");
        }
    };

    const playBuzzer = () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = new AudioCtx();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;

            const tone = (time, freq, length) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, time);
                gain.gain.setValueAtTime(0.5, time); // Loud & Sharp
                gain.gain.exponentialRampToValueAtTime(0.01, time + length);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(time);
                osc.stop(time + length);
            };

            // Teent Teent - High Pitch
            tone(now, 800, 0.08);
            tone(now + 0.12, 800, 0.08);

        } catch (err) { console.log("Audio play failed:", err); }
    };

    const triggerError = (msg) => {
        // Clear and Reset state to force visual blink
        setPosError(null);
        const finalMsg = msg === "NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO." ? "NO TIENE PERMISO" : msg;

        // Short delay to force React to re-trigger visual state
        setTimeout(() => setPosError(finalMsg), 10);

        playBuzzer();
        setTimeout(() => setPosError(null), 2500);
    };

    const handleDescansar = () => {
        if (!isDescanso) {
            if (posCart.length > 0) {
                triggerError("CANCELE EL TICKET PRIMERO");
                return;
            }
            setIsDescanso(true);
            setDescansoStartTime(new Date());
            setDescansoStep(0);
        } else {
            // Starting unlock flow - Wake up screen
            setIsScreenDimmed(false);
            setDescansoStep(1);
        }
        setPosInput('');
    };

    const handleConexion = () => {
        triggerError("🌐 COMPROBANDO CONEXIÓN...");
    };

    const addItemToCart = (product) => {
        if (!product) return;
        if (isDrawerOpen) {
            triggerError("CIERRE LA CAJA PRIMERO");
            return;
        }

        if (isConsultMode) {
            setConsultProduct(product);
            setPosInput('');
            return;
        }

        if (changeAmountDisplay !== null) {
            triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
            return;
        }
        const qtyToAdd = posQty > 1 ? posQty : 1;
        const itemIndex = posCart.findIndex(i => i.id === product.id);

        if (itemIndex > -1) {
            const newCart = [...posCart];
            newCart[itemIndex].qty += qtyToAdd;
            setPosCart(newCart);
        } else {
            setPosCart([...posCart, { ...product, qty: qtyToAdd }]);
        }
        setPosQty(1);
    };

    const removeFromCart = (id) => {
        if (changeAmountDisplay !== null) {
            triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
            return;
        }
        setPosCart(prev => prev.filter(item => item.id !== id));
    };

    const handleSetQuantity = () => {
        const qty = parseInt(posInput);
        if (!isNaN(qty) && qty > 0) {
            setPosQty(qty);
            setPosInput('');
        }
    };

    const handleBolsa = () => {
        const bolsaItem = {
            id: 'BOLSA-999',
            barcode: '1',
            name: 'BOLSA CARREFOUR',
            sell_price: 0.15,
            qty: 1
        };
        addItemToCart(bolsaItem);
    };

    const handleAnularTicket = () => {
        if (changeAmountDisplay !== null) {
            triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
            return;
        }
        if (posCart.length === 0) return;
        if (cartTotal > 2.50) {
            triggerError("SEGURIDAD: TRANSACCIÓN > 2.50€");
        }
        if (window.confirm('¿ELIMINAR TICKET COMPLETO?')) {
            setPosCart([]);
            setPosQty(1);
            setPosInput('');
        }
    };

    const speakCaja = (num) => {
        const text = `Caja numero ${num === 1 ? 'uno' : 'dos'}, por favor.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.pitch = 1.45; // Younger/High tone
        utterance.rate = 0.85;   // Softer/Relaxed speed

        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('female'))
            || voices.find(v => v.lang.startsWith('es'));

        if (spanishVoice) utterance.voice = spanishVoice;
        window.speechSynthesis.speak(utterance);
        setAvisarMenuOpen(false);
    };

    const handlePrintRetirada = (data) => {
        const printWindow = window.open('', '_blank', 'width=300,height=600');
        const html = `
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { font-family: 'Courier New', monospace; padding: 20px; width: 260px; font-size: 12px; line-height: 1.4; color: #000; }
                    .header { text-align: center; font-weight: bold; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .title { font-size: 16px; margin: 10px 0; }
                    .row { display: flex; justify-content: space-between; margin: 4px 0; }
                    .total { font-size: 18px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin-top: 10px; }
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
                    .sig-box { margin-top: 40px; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>CARREFOUR EXPRESS</div>
                    <div>RONDA DE OUTEIRO 112</div>
                    <div class="title">COMPROBANTE RETIRADA</div>
                </div>
                <div class="row"><span>FECHA:</span> <span>${data.time.toLocaleDateString()}</span></div>
                <div class="row"><span>HORA:</span> <span>${data.time.toLocaleTimeString()}</span></div>
                <div class="row"><span>CAJA:</span> <span>T-01</span></div>
                <div class="row"><span>CAJERO:</span> <span>SOHAIL</span></div>
                <div class="row"><span>SUPERVISOR:</span> <span>ID: ${data.id}</span></div>
                <div class="row" style="margin-top: 10px;"><span>MOTIVO:</span> <span style="font-weight:bold;">${data.reason}</span></div>
                <div class="total">
                    <span>IMPORTE:</span>
                    <span>${data.amount.toFixed(2)}€</span>
                </div>
                <div style="display: flex; gap: 20px;">
                    <div class="sig-box" style="flex: 1;">FIRMA CAJERO</div>
                    <div class="sig-box" style="flex: 1;">FIRMA RESP.</div>
                </div>
                <div class="footer">
                    *** COPIA PARA CONTABILIDAD ***<br>
                    GRACIAS POR SU GESTIÓN
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handlePrintTicket = (items, total, paymentMethod = 'METÁLICO', given = 0, change = 0) => {
        const printWindow = window.open('', '_blank', 'width=300,height=850');
        const now = new Date();

        // IVA Calculation (21%)
        const base = total / 1.21;
        const cuota = total - base;

        const html = `
            <html>
            <head>
                <style>
                    @page { margin: 0; }
                    body { font-family: 'Courier New', monospace; padding: 10px; width: 280px; font-size: 12px; line-height: 1.1; color: #000; letter-spacing: -0.5px; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 4px 0; }
                    .double-divider { border-top: 2px solid #000; margin: 6px 0; }
                    .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
                    .item-name { flex: 1; text-transform: uppercase; white-space: nowrap; overflow: hidden; }
                    .item-price { width: 70px; text-align: right; }
                    .tax-table { width: 100%; font-size: 11px; margin-top: 5px; }
                    .footer-msg { font-size: 10px; margin-top: 10px; text-align: center; line-height: 1.2; }
                    .barcode { font-family: 'Libre Barcode 39', cursive; font-size: 40px; text-align: center; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="center bold">
                    * CARREFOUR EXPRESS *<br>
                    RONDA DE OUTEIRO, 112 - CORUÑA<br>
                    TELÉFONO ATENCIÓN CLIENTE: 914908900<br>
                    ***** PVP IVA INCLUIDO *****
                </div>

                <div style="margin-top: 15px;">
                    ${items.map(item => `
                        <div class="item-row">
                            <span class="item-name">${item.name.toUpperCase()}</span>
                            <span class="item-price">${(item.sell_price * item.qty).toFixed(2).replace('.', ',')}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="double-divider"></div>
                <div class="bold" style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>${items.length} ART. TOTAL A PAGAR :</span>
                    <span>${total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="double-divider"></div>

                <table class="tax-table center">
                    <tr class="bold">
                        <td>TIPO</td>
                        <td>BASE</td>
                        <td>CUOTA</td>
                    </tr>
                    <tr>
                        <td>21,00%</td>
                        <td>${base.toFixed(2).replace('.', ',')}</td>
                        <td>${cuota.toFixed(2).replace('.', ',')}</td>
                    </tr>
                </table>

                <div class="divider"></div>
                <div class="item-row"><span>PAGADO ${paymentMethod.toUpperCase()}</span> <span>${total.toFixed(2).replace('.', ',')}</span></div>
                <div class="item-row"><span>${paymentMethod.toUpperCase()} ENTREGADO</span> <span>${(given || total).toFixed(2).replace('.', ',')}</span></div>
                <div class="item-row"><span>CAMBIO RECIBIDO</span> <span>${(change || 0).toFixed(2).replace('.', ',')}</span></div>

                <div class="footer-msg">
                    PLAZO DEVOLUC. 60 DIAS CONSERVE TICKET<br>
                    ALTIQO GLOBAL S.L.<br>
                    NIF B22750350<br><br>
                    ¡NUEVO! Mi Día de El CLUB ya está aquí<br>
                    Escanea el QR y descúbrelo<br><br>
                    El importe de los envases o envoltorios de plástico está incluido en el precio final del producto.(Ley 7/2022)
                </div>

                <div style="text-align:center; margin-top:10px;">
                    <div style="font-size: 10px;">NRF: N5927132260206000232</div>
                    <div style="height: 40px; border-left: 2px solid black; border-right: 2px solid black; border-bottom: 2px solid black; margin: 5px auto; width: 80%; display: flex; align-items: flex-end; justify-content: space-around; padding-bottom: 2px;">
                        ${Array(25).fill(0).map(() => `<div style="width: ${Math.random() > 0.5 ? '2px' : '1px'}; background: black; height: ${25 + Math.random() * 10}px;"></div>`).join('')}
                    </div>
                </div>

                <div style="font-size: 11px; margin-top: 10px;">
                    ${now.toLocaleDateString()} ${now.toLocaleTimeString()} &nbsp; 0102 132 5927 8569<br>
                    LE ATENDIO : &nbsp;&nbsp; ESTEFANI
                </div>

                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleRetiradaNext = () => {
        if (retiradaStep === 1) {
            // Step 1: Amount
            const amount = parseFloat(posInput || '0') / 100;
            if (amount <= 0) {
                triggerError("INGRESE CANTIDAD");
                return;
            }
            setTempRetirada({ ...tempRetirada, amount: amount });
            setPosInput('');
            setRetiradaStep(2);
        } else if (retiradaStep === 3) {
            // Step 3: ID Auth
            if (!posInput) {
                triggerError("INGRESE ID");
                return;
            }
            setTempRetirada({ ...tempRetirada, id: posInput });
            setPosInput('');
            setRetiradaStep(4);
        } else if (retiradaStep === 4) {
            // Step 4: PIN Auth
            if (!posInput) {
                triggerError("INGRESE PIN");
                return;
            }
            // Finalize
            const finalized = { ...tempRetirada, pin: posInput, time: new Date() };
            setDailyWithdrawals([...dailyWithdrawals, finalized]);

            // Print Retirada Ticket
            handlePrintRetirada(finalized);

            triggerError(`RETIRADA REGISTRADA: ${tempRetirada.amount}€`);

            // Reset
            setIsRetiradaPressed(false);
            setRetiradaStep(1);
            setPosInput('');
            setTempRetirada({ amount: 0, reason: 'RECOGIDA', id: '', pin: '' });
        }
    };

    const formatAsCurrency = (val) => {
        if (!val) return '0.00';
        const num = parseFloat(val) / 100;
        return num.toFixed(2);
    };

    useEffect(() => {
        let interval;
        if (isDescanso && descansoStartTime && !isScreenDimmed) {
            interval = setInterval(() => {
                const now = new Date();
                const diffMinutes = (now - descansoStartTime) / (1000 * 60);
                if (diffMinutes >= 5) {
                    setIsScreenDimmed(true);
                }
            }, 5000); // Check every 5 seconds
        }
        return () => clearInterval(interval);
    }, [isDescanso, descansoStartTime, isScreenDimmed]);

    const updatePosInput = (newValue) => {
        // Only allow digits
        const digits = newValue.replace(/\D/g, '');

        // Retirada or Descanso ID/PIN specific limit (4 digits)
        if ((isRetiradaPressed && (retiradaStep === 3 || retiradaStep === 4)) || (isDescanso && descansoStep > 0)) {
            if (digits.length > 4) {
                playBuzzer();
                return;
            }
        } else if (digits.length > 13) {
            // General limit for EAN/Amount
            triggerError("LÍMITE ALCANZADO");
            return;
        }

        setPosInput(digits);
    };

    const handleAddToCartManual = async (e) => {
        e.preventDefault();
        if (!posInput) return;

        if (isDescanso) {
            playBuzzer();
            setPosInput('');
            return;
        }

        if (isDrawerOpen) {
            triggerError("CIERRE LA CAJA PRIMERO");
            setPosInput('');
            return;
        }
        if (changeAmountDisplay !== null) {
            triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
            setPosInput('');
            return;
        }
        try {
            // --- NEW: VARIABLE PRICE BARCODE (BANDEJAS) ---
            if (posInput.startsWith('2') && posInput.length === 13) {
                const productIdPart = posInput.substring(1, 7);
                const pricePart = posInput.substring(7, 12);
                const priceFloat = parseFloat(pricePart) / 100;

                // Lookup product by ID or prefix match in LOCAL array
                const foundProd = products.find(p => p.barcode === productIdPart || p.barcode === `0${productIdPart}` || p.barcode === `00${productIdPart}`);
                
                if (foundProd) {
                    const bandejaItem = {
                        ...foundProd,
                        sell_price: priceFloat,
                        name: `${foundProd.name} (BANDEJA)`,
                        barcode: posInput,
                        qty: 1
                    };
                    addItemToCart(bandejaItem);
                    setPosInput('');
                    return;
                }
            }

            // Check if it's a parked ticket (Starts with 999 and is 12 digits)
            if (posInput.startsWith('999') && posInput.length === 12) {
                const res = await fetch(`${API_BASE}/parked-sales/${posInput}`);
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.cart_data) {
                        setPendingParkedCart(result.cart_data);
                        setPendingParkedId(posInput);
                        setPosInput('');
                        return;
                    }
                }
            }

            // INSTANT LOCAL SEARCH
            const found = products.find(p => p.barcode === posInput);
            if (found) {
                addItemToCart(found);
            } else {
                // Final fallback: try network if not in local list (e.g. newly added on another terminal)
                const res = await fetch(`${API_BASE}/product/${posInput}`);
                const netFound = await res.json();
                if (netFound && netFound.id) {
                    addItemToCart(netFound);
                } else {
                    triggerError("EAN NO ENCONTRADO");
                }
            }
        } catch (err) { triggerError("ERROR DE CONEXIÓN"); }
        setPosInput('');
    };

    const handleAddColdCharge = (amount, label) => {
        if (changeAmountDisplay !== null) {
            triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
            return;
        }
        const chargeItem = {
            id: `COLD-${amount}-${Date.now()}`,
            barcode: 'EXTRA-FRÍO',
            name: `SUPLEMENTO FRÍO ${label}`,
            sell_price: amount,
            qty: 1
        };
        addItemToCart(chargeItem);
        setActiveSubMenu(null);
    };

    const finalizeSale = async (printTicket = true) => {
        if (posCart.length === 0) return;

        // Capture payment details BEFORE resetting state
        const captureMethod = changeAmountDisplay && String(changeAmountDisplay).includes('TARJETA') ? 'TARJETA' : 'METÁLICO';
        const captureGiven = givenAmount;
        const captureChange = parseFloat(changeAmountDisplay || '0');
        const itemsToPrint = [...posCart];
        const totalToPrint = cartTotal;

        const saleData = {
            items: itemsToPrint,
            total: totalToPrint,
            timestamp: new Date().toISOString()
        };

        // Reset all POS states for new customer
        setPosCart([]);
        setPosInput('');
        setIsMetalicoPressed(false);
        setIsSubtotalPressed(false);
        setChangeAmountDisplay(null);
        setGivenAmount(0);

        if (printTicket === true) {
            handlePrintTicket(itemsToPrint, totalToPrint, captureMethod, captureGiven, captureChange);
        }

        try {
            await fetch(`${API_BASE}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });

            // Send automatic email copy to owner
            fetch(`${API_BASE}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ saleData, targetEmail: 'slwforever143@gmail.com' })
            }).catch(e => console.error('Sale email error:', e));

            setCustomerCount(prev => prev + 1);
            fetchData();
        } catch (err) {
            console.error('Error al procesar la venta en background:', err);
        }
    };

    return (
        <div className="pos-master-container">
            {/* --- NAVIGATION & SCAN BAR --- */}
            <div className="pos-header-hub">
                <div className="pos-header-left">
                    <button className="pos-back-btn" onClick={() => setView('landing')}>← SALIR</button>
                    <div className="top-left-brand-pos">
                        <img src={logo} alt="Carrefour" className="desktop-logo-rounded" style={{ height: '60px' }} />
                        <div className="brand-info">
                            <div className="brand-main" style={{ fontSize: '1.8rem' }}><span className="blue">Carrefour</span> <span className="red">express</span></div>
                            <div className="brand-addr" style={{ fontSize: '0.8rem' }}>RONDA DE OUTEIRO 112 - <span className="blue-light">A CORUÑA</span></div>
                        </div>
                    </div>
                </div>

                <div className="pos-status-board" style={{ flex: '0 0 400px', background: '#003986', color: 'white', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 20px', boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: '900', letterSpacing: '1px' }}>ESTADO CAJA</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: '950', color: isDescanso ? '#f43f5e' : '#39FF14' }}>
                            {isDescanso ? 'CERRADA 🔒' : 'ABIERTA ✅'}
                        </span>
                    </div>
                    <div style={{ width: '2px', background: 'rgba(255,255,255,0.2)', height: '80%' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: '900', letterSpacing: '1px' }}>MODO</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: '950', color: isDescanso ? '#fbbf24' : '#fff' }}>
                            {isDescanso ? 'DESCANSO ☕' : 'VENTA 🛒'}
                        </span>
                    </div>
                    <div style={{ width: '2px', background: 'rgba(255,255,255,0.2)', height: '80%' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: '900', letterSpacing: '1px' }}>TERMINAL</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: '950', color: '#fff' }}>T-01 🖥️</span>
                    </div>

                    <form onSubmit={handleAddToCartManual} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={posInput}
                            onChange={(e) => updatePosInput(e.target.value)}
                            autoFocus
                            autoComplete="off"
                            inputMode="text"
                        />
                    </form>
                </div>

                <div className="pos-header-status-strip">
                    <span className="strip-item">👤 {('SOHAIL').toUpperCase()}</span>
                    <span className="strip-item timer">⏱️ {formatDuration(sessionStartTime, currentTime)}</span>
                    <span className="strip-item time">{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="strip-item date">{currentTime.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                </div>
            </div>

            <div className={`pos-main-grid-layout ${isSubtotalPressed ? 'is-payment-mode' : ''}`}>
                {/* --- CENTER KEYPAD AREA --- */}
                <div className="pos-keypad-central">
                    {/* SECTION 1: PAN & BEBIDAS + MATRIX */}
                    <div className="pos-section-col sec-1" style={{ width: '375px', flexShrink: 0, visibility: isSubtotalPressed ? 'hidden' : 'visible' }}>
                        <div className="section-top" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}>
                            <div className="shortcut-box icon-bread" style={{ flex: 1.4 }} onClick={() => {
                                if (changeAmountDisplay !== null) triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
                                else { setActiveSubMenu('panaderia'); setSubMenuLevel(0); }
                            }}>🥖🥐</div>
                            <div className="shortcut-box icon-drinks" style={{ flex: 1 }} onClick={() => {
                                if (changeAmountDisplay !== null) triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
                                else setActiveSubMenu('bebidas');
                            }}>🍹🥤</div>
                        </div>
                        <div className="section-matrix" onClickCapture={(e) => {
                            if (changeAmountDisplay !== null) {
                                e.stopPropagation();
                                triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
                            }
                        }}>
                            <div className="matrix-col col-1">
                                {isRetiradaPressed && retiradaStep === 2 ? (
                                    <>
                                        <button className="m-btn btn-peach" style={{ fontWeight: '950' }} onClick={() => { setTempRetirada({ ...tempRetirada, reason: 'RECOGIDA' }); setRetiradaStep(3); }}>RECOGIDA</button>
                                        <button className="m-btn btn-grey" style={{ fontWeight: '950' }} onClick={() => { setTempRetirada({ ...tempRetirada, reason: 'CAMBIO' }); setRetiradaStep(3); }}>CAMBIO</button>
                                        <button className="m-btn btn-pink-light" style={{ fontWeight: '950' }} onClick={() => { setTempRetirada({ ...tempRetirada, reason: 'GASTOS' }); setRetiradaStep(3); }}>GASTOS</button>
                                        <button className="m-btn btn-purple-light" style={{ fontWeight: '950' }} onClick={() => { setTempRetirada({ ...tempRetirada, reason: 'OTROS' }); setRetiradaStep(3); }}>OTROS</button>
                                        <button className="m-fill"></button>
                                        <button className="m-fill"></button>
                                        <button className="m-fill"></button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ position: 'relative', visibility: isDescanso ? 'hidden' : 'visible' }}>
                                            <button
                                                className="m-btn btn-peach"
                                                style={{ fontWeight: '950', width: '100%' }}
                                                onClick={() => setAvisarMenuOpen(!avisarMenuOpen)}
                                            >
                                                AVISAR FILA UNICA
                                            </button>

                                            {avisarMenuOpen && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '50px',
                                                    left: '0',
                                                    width: '100%',
                                                    background: '#fff',
                                                    border: '2px solid #003986',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                                    zIndex: 2100,
                                                    padding: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '5px'
                                                }}>
                                                    <button
                                                        style={{ padding: '10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: '900', cursor: 'pointer' }}
                                                        onClick={() => speakCaja(1)}
                                                    >
                                                        CAJA 1
                                                    </button>
                                                    <button
                                                        style={{ padding: '10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: '900', cursor: 'pointer' }}
                                                        onClick={() => speakCaja(2)}
                                                    >
                                                        CAJA 2
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="m-btn btn-grey"
                                            style={{ visibility: isDescanso ? 'hidden' : 'visible' }}
                                            onClick={() => {
                                                if (posInput === '9') {
                                                    setIsDrawerOpen(true);
                                                    setPosInput('');
                                                } else if (posInput === '47') {
                                                    setIsConsultMode(true);
                                                    setConsultProduct(null);
                                                    setPosInput('');
                                                } else if (posInput === '11') {
                                                    handleAparcarTicket();
                                                    setPosInput('');
                                                } else if (posInput === '12') {
                                                    // Trigger reprint/resume logic (since we use barcode for resume, we can show a prompt or manual ID)
                                                    triggerError("INTRODUZCA ID TICKET");
                                                    setPosInput('');
                                                } else {
                                                    triggerError("FUNCIÓN NO DISPONIBLE");
                                                    setPosInput('');
                                                }
                                            }}
                                        >
                                            FUNCION
                                        </button>
                                        <button className="m-btn btn-pink-light" style={{ visibility: isDescanso ? 'hidden' : 'visible' }} onClick={handleAparcarTicket}>APARCAR TICKET</button>
                                        <button className="m-btn btn-purple-light" style={{ visibility: isDescanso ? 'hidden' : 'visible' }} onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                        <button className="m-btn btn-cyan-light" style={{ visibility: isDescanso ? 'hidden' : 'visible' }} onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                        <button className="m-btn btn-purple-light" style={{ visibility: isDescanso ? 'hidden' : 'visible' }} onClick={handleAnularTicket}>Anular ticket</button>
                                        <button className="m-btn btn-green-huge" style={{ visibility: isDescanso ? 'hidden' : 'visible' }} onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                    </>
                                )}
                            </div>
                            <div className="matrix-col col-23">
                                <div className="m-row">
                                    <button
                                        className="m-btn btn-pink"
                                        style={{ fontWeight: '950', visibility: isDescanso ? 'hidden' : 'visible' }}
                                        onClick={() => {
                                            if (posCart.length === 0) {
                                                setIsRetiradaPressed(true);
                                                setRetiradaStep(1);
                                                setPosInput('');
                                            } else {
                                                triggerError("CANCELE EL TICKET PRIMERO");
                                            }
                                        }}
                                    >
                                        RETIRADAS
                                    </button>
                                    <button className="m-btn btn-briefing" style={{ fontSize: '0.65rem', fontWeight: '950', visibility: isDescanso ? 'hidden' : 'visible' }} onClick={() => triggerError("IMPRESORA NO DETECTADA")}>REIMPRIMIR TICKET</button>
                                </div>
                                <div className="m-row" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}>
                                    <button className="m-btn btn-blue-icon" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                    <button className="m-btn btn-yellow" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                </div>
                                <div className="m-row" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}>
                                    <button className="m-btn btn-blue-light" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                    <button className="m-btn btn-yellow" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                </div>
                                <div className="m-row" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}>
                                    <button className="m-btn btn-grey-dni" onClick={() => triggerError("LECTOR DNI APAGADO")}></button>
                                    <button className="m-btn btn-yellow" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                </div>
                                <div className="m-row" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}>
                                    <button className="m-btn btn-green-icon" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                    <button className="m-btn btn-yellow" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                </div>
                                <div className="m-row" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}>
                                    <button className="m-btn btn-orange-ticket" onClick={() => triggerError("TICKET NO ENCONTRADO")}></button>
                                    <button className="m-btn btn-green" onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                </div>
                                <div className="m-row" style={{ height: '180px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                        <button className="m-btn" style={{ flex: 1, height: 'auto', fontSize: '1rem', background: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: '950' }} onClick={handleDescansar}>
                                            {isDescanso ? 'FIN DESCANSO' : 'DESCANSAR'}
                                        </button>
                                        <button className="m-btn" style={{ flex: 1, height: 'auto', fontSize: '0.8rem', background: '#0891b2', color: '#ffffff', border: 'none', visibility: isDescanso ? 'hidden' : 'visible' }} onClick={handleConexion}>CONEXIÓN</button>
                                    </div>
                                    <button className="m-btn btn-blue" style={{ flex: 1, height: '100%', visibility: isDescanso ? 'hidden' : 'visible' }} onClick={() => triggerError("TECLA SIN ASIGNAR")}></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: DISPLAY SCREEN + NUMPAD */}
                    <div className="pos-section-col sec-2" style={{ position: 'relative' }}>

                        <div className="pos-high-display animate-slideDown" style={{ margin: 0, flex: 1, minHeight: '180px' }}>
                            {isDrawerOpen ? (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%' }}>
                                    <div style={{ fontSize: '3.5rem', fontWeight: '950', color: '#f43f5e', textAlign: 'center' }}>⚠️ CAJA ABIERTA</div>
                                </div>
                            ) : posError ? (
                                <div className="high-display-item" style={{ textAlign: 'center', color: '#f43f5e' }}>
                                    <div style={{ fontSize: '1.2rem', color: '#fecaca', marginBottom: '10px', fontWeight: '900' }}>⚠️ ERROR</div>
                                    <div style={{ fontSize: '1.8rem', lineHeight: '1.2', textShadow: '0 0 10px rgba(244,63,94,0.5)' }}>{posError}</div>
                                </div>
                            ) : isDescanso && descansoStep > 0 ? (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1, width: '100%', padding: '15px 20px', position: 'relative' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '950', color: '#39FF14', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Courier New', Courier, monospace" }}>
                                        {descansoStep === 1 ? 'USUARIO' : 'CONTRASEÑA'}
                                    </div>
                                    <div style={{ fontSize: '3.5rem', fontWeight: '950', color: '#39FF14', fontFamily: "'Courier New', Courier, monospace", width: '100%', textAlign: 'center', marginTop: '10px' }}>
                                        {descansoStep === 1 ? (posInput || '') : '*'.repeat(posInput.length)}
                                    </div>
                                </div>
                            ) : changeAmountDisplay !== null || isMetalicoPressed || isSubtotalPressed ? (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', flex: 1, width: '100%', padding: '10px 25px', gap: '0px' }}>
                                    {/* ROW 1: SUBTOTAL */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '950', color: '#39FF14', textTransform: 'uppercase' }}>SUBTOTAL</div>
                                        <div style={{ fontSize: '2.2rem', fontWeight: '950', color: '#39FF14', fontFamily: 'monospace' }}>€{cartTotal.toFixed(2)}</div>
                                    </div>

                                    {/* ROW 2: METÁLICO ENTRY OR CAMBIO DISPLAY */}
                                    {(isMetalicoPressed || changeAmountDisplay !== null) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-5px' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '950', color: '#39FF14', textTransform: 'uppercase' }}>
                                                {changeAmountDisplay !== null ? (String(changeAmountDisplay).includes('TARJETA') ? 'TARJETA' : 'CAMBIO') : 'METÁLICO'}
                                            </div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: '950', color: '#39FF14', fontFamily: 'monospace' }}>
                                                {changeAmountDisplay !== null
                                                    ? (changeAmountDisplay === 'TARJETA_WAIT' ? '⏳...' : changeAmountDisplay === 'TARJETA_OK' ? '✅' : `${changeAmountDisplay}€`)
                                                    : (posInput ? `${formatAsCurrency(posInput)}€` : '0,00€')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : isRetiradaPressed ? (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%', gap: '10px' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fca5a5', textTransform: 'uppercase' }}>
                                        {retiradaStep === 1 ? '💸 CANTIDAD A RETIRAR' :
                                            retiradaStep === 2 ? '❓ SELECCIONE MOTIVO' :
                                                retiradaStep === 3 ? '🔐 ID SUPERVISOR' : '🔑 PIN SEGURIDAD'}
                                    </div>
                                    <div style={{ fontSize: '3.2rem', fontWeight: '950', color: '#39FF14', fontFamily: "'Courier New', Courier, monospace" }}>
                                        {retiradaStep === 1 && formatAsCurrency(posInput) + '€'}
                                        {retiradaStep === 2 && tempRetirada.reason}
                                        {retiradaStep === 3 && (posInput || '')}
                                        {retiradaStep === 4 && '*'.repeat(posInput.length)}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '800' }}>
                                        {retiradaStep === 1 ? 'USE EL TECLADO Y PULSE [SI]' :
                                            retiradaStep === 2 ? 'USE LOS BOTONES DE LA IZQUIERDA' :
                                                'INTRODUZCA DATOS Y PULSE [SI]'}
                                    </div>
                                </div>
                            ) : isConsultMode ? (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%', gap: '10px' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase' }}>🔍 CONSULTA DE PRECIO</div>
                                    {consultProduct ? (
                                        <>
                                            <div style={{ fontSize: '2.5rem', fontWeight: '950', color: '#fff', textAlign: 'center' }}>{(consultProduct.name).toUpperCase()}</div>
                                            <div style={{ fontSize: '4.5rem', fontWeight: '950', color: '#39FF14' }}>€{parseFloat(consultProduct.sell_price).toFixed(2)}</div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '2rem', color: '#94a3b8', animation: 'pulse 1.5s infinite' }}>PASE EL PRODUCTO</div>
                                    )}
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }}>USE [NO] PARA SALIR</div>
                                </div>
                            ) : isParkingConfirm ? (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%', gap: '15px' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: '950', color: '#fde047', textTransform: 'uppercase' }}>¿APARCAR TICKET?</div>
                                    <div style={{ display: 'flex', gap: '40px', fontSize: '2.5rem', fontWeight: '950', color: '#fff', fontFamily: "'Courier New', Courier, monospace" }}>
                                        <span style={{ color: '#39FF14' }}>[SI]</span>
                                        <span style={{ color: '#f43f5e' }}>[NO]</span>
                                    </div>
                                </div>
                            ) : pendingParkedCart ? (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, width: '100%', gap: '15px' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: '950', color: '#0ea5e9', textTransform: 'uppercase' }}>¿RECUPERAR VENTA?</div>
                                    <div style={{ fontSize: '1.2rem', color: '#fff' }}>TICKET ID: {pendingParkedId}</div>
                                    <div style={{ display: 'flex', gap: '40px', fontSize: '2.5rem', fontWeight: '950', color: '#fff', fontFamily: "'Courier New', Courier, monospace" }}>
                                        <span style={{ color: '#39FF14' }}>[SI]</span>
                                        <span style={{ color: '#f43f5e' }}>[NO]</span>
                                    </div>
                                </div>
                            ) : posInput ? (
                                <div className="high-display-item" style={{ textAlign: 'left', fontSize: '2.0rem', letterSpacing: '2px', color: '#39FF14', paddingTop: '15px', paddingLeft: '20px', fontFamily: "'Courier New', Courier, monospace" }}>
                                    {isSubtotalPressed || isRetiradaPressed ? `€${formatAsCurrency(posInput)}` : posInput}
                                    {posCart.length > 0 && !isRetiradaPressed && (
                                        <div style={{ fontSize: '1.1rem', color: '#93c5fd', marginTop: '10px' }}>TOTAL: €{cartTotal.toFixed(2)}</div>
                                    )}
                                </div>
                            ) : posQty > 1 ? (
                                <div className="high-display-item" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', paddingLeft: '20px', paddingTop: '5px' }}>
                                    <div style={{ fontSize: '1.2rem', color: '#93c5fd', fontWeight: '900', fontFamily: 'monospace', marginBottom: '0' }}>CANTIDAD</div>
                                    <div style={{ fontSize: '4rem', color: '#39FF14', fontWeight: '950', fontFamily: 'monospace' }}>× {posQty}</div>
                                </div>
                            ) : posCart.length > 0 ? (
                                <div className="high-display-item" style={{ paddingLeft: '20px' }}>
                                    <div className="high-display-name" style={{ fontSize: '1.8rem', marginBottom: '10px' }}>
                                        {posCart[posCart.length - 1].qty > 1 ? `${posCart[posCart.length - 1].qty} X ` : ''}
                                        {(posCart[posCart.length - 1].name).toUpperCase()}
                                    </div>
                                    <div className="high-display-price" style={{ fontSize: '4rem' }}>€{parseFloat(posCart[posCart.length - 1].sell_price).toFixed(2)}</div>
                                </div>
                            ) : (
                                <div className="high-display-placeholder" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, width: '100%' }}>
                                    <div style={{ fontSize: '1.7rem', fontWeight: '950', letterSpacing: '2px', textTransform: 'uppercase', color: '#39FF14', fontFamily: "'Courier New', Courier, monospace", textAlign: 'left', padding: '10px 0' }}>
                                        {isDescanso ? 'DESCANSO' : 'NUEVO CLIENTE'}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '950', color: '#39FF14', fontFamily: "'Courier New', Courier, monospace", paddingBottom: '5px', opacity: 0.8 }}>
                                        <span>No.c: {String(customerCount).padStart(3, '0')}</span>
                                        <span>CAJA: 01</span>
                                        <span>V: 2.0</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="matrix-col col-numpad" style={{ flex: 'none', background: 'transparent', padding: '0' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="np-grid" style={{ flex: 1 }}>
                                    {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0, '.', '00'].map(num => (
                                        <button key={num} className="np-key" onClick={() => {
                                            updatePosInput(posInput + num);
                                        }}>
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '90px' }}>
                                    <button className="np-key btn-arrow" style={{ width: '100%', height: '70px', background: '#475569', color: 'white', fontSize: '1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', boxShadow: '0 4px 0 #334155' }} onClick={() => setPosInput(p => p.slice(0, -1))}>←</button>
                                    <button className="np-key btn-cantidad" style={{ width: '100%', flex: 1, background: '#22c55e', color: 'white', fontSize: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', boxShadow: '0 4px 0 #16a34a', fontWeight: 'bold' }} onClick={() => {
                                        if (changeAmountDisplay !== null) triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
                                        else handleSetQuantity();
                                    }}>{posQty > 1 ? `${posQty}x` : 'Cant'}</button>
                                    <button className="np-key btn-borrar" style={{ width: '100%', flex: 1, background: '#f43f5e', color: 'white', fontSize: '1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', boxShadow: '0 4px 0 #be123c', fontWeight: 'bold' }} onClick={() => {
                                        setPosInput('');
                                        setPosQty(1);
                                        setIsSubtotalPressed(false);
                                        setIsMetalicoPressed(false);
                                        setChangeAmountDisplay(null);
                                    }}>Borrar</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}>
                                <button style={{ flex: 1, height: '90px', borderRadius: '12px', border: 'none', background: '#eab308', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></button>
                                <button style={{ flex: 1, height: '90px', borderRadius: '12px', border: 'none', background: '#ec4899', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></button>
                                <button style={{ flex: 1, height: '90px', borderRadius: '12px', border: 'none', background: '#8b5cf6', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: BOLSA & HIELO + PAYMENT FLOW */}
                    <div className="pos-section-col sec-3" style={{ width: '290px', flexShrink: 0 }}>
                        <div className="section-top" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}>
                            <div className="shortcut-box half" style={{ background: '#dcfce7', border: '2px solid #166534', flex: 1 }} onClick={() => addItemToCart({ id: 'bolsa_015', name: 'Bolsa 0.15', sell_price: 0.15, barcode: 'BOLSA15' })}>
                                <span>🛍️</span>
                                <span style={{ color: '#166534' }}>Bolsa 0.15€</span>
                            </div>
                            <div className="shortcut-box half shortcut-hielo" style={{ background: '#e0f2fe', border: '2px solid #0369a1', flex: 1 }} onClick={() => addItemToCart({ id: 'hielo_125', name: 'Hielo (Barf)', sell_price: 1.25, barcode: 'HIELO' })}>
                                <span>🧊</span>
                                <span style={{ color: '#0369a1' }}>Hielo 1.25€</span>
                            </div>
                        </div>
                        <div className="section-matrix">
                            <div className="matrix-col col-right-misc" onClickCapture={(e) => {
                                const isPaymentAction = e.target.classList.contains('btn-tarjeta-custom') || e.target.classList.contains('btn-red-no') || e.target.classList.contains('btn-green-si');
                                if (changeAmountDisplay !== null && !isPaymentAction) {
                                    e.stopPropagation();
                                    triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
                                }
                            }}>
                                <button className="m-btn btn-blue-light" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className="m-btn btn-blue-light" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className="m-btn btn-blue-light" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <div className="m-fill" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}></div>
                                <button className={`m-btn btn-tarjeta-custom ${isSubtotalPressed && !isMetalicoPressed && changeAmountDisplay === null ? 'pulse-effect' : ''}`} style={{ visibility: isDescanso ? 'hidden' : 'visible' }} onClickCapture={(e) => {
                                    if (isDescanso) {
                                        e.stopPropagation();
                                        return;
                                    }
                                }} onClick={() => {
                                    if (isMetalicoPressed) {
                                        triggerError("NO TIENES PERMISO. PULSE SUBTOTAL PARA CAMBIAR EL MÉTODO.");
                                        return;
                                    }
                                    if (posCart.length > 0 && changeAmountDisplay === null) {
                                        setChangeAmountDisplay('TARJETA_WAIT');
                                        setTimeout(() => { setChangeAmountDisplay('TARJETA_OK'); }, 3500);
                                    } else if (changeAmountDisplay !== null) {
                                        setChangeAmountDisplay(null);
                                        setIsSubtotalPressed(false);
                                        setIsMetalicoPressed(false);
                                        setPosInput('');
                                    }
                                }}>TARJETA</button>
                                <button className={`m-btn btn-red-no ${(changeAmountDisplay !== null && changeAmountDisplay !== 'TARJETA_WAIT') || (isMetalicoPressed && posInput) ? 'pulse-effect' : ''}`} onClick={() => {
                                    if (changeAmountDisplay === 'TARJETA_WAIT') return;
                                    if (isConsultMode) {
                                        setIsConsultMode(false);
                                        setConsultProduct(null);
                                        return;
                                    }
                                    if (isRetiradaPressed) {
                                        setIsRetiradaPressed(false);
                                        setRetiradaStep(1);
                                        setPosInput('');
                                        return;
                                    }
                                    if (isParkingConfirm) {
                                        setIsParkingConfirm(false);
                                        return;
                                    }
                                    if (pendingParkedCart) {
                                        setPendingParkedCart(null);
                                        setPendingParkedId(null);
                                        return;
                                    }
                                    if (isDescanso && descansoStep > 0) {
                                        setDescansoStep(0);
                                        setPosInput('');
                                        return;
                                    }
                                    if (changeAmountDisplay !== null) finalizeSale(false);
                                    else {
                                        setIsSubtotalPressed(false);
                                        setIsMetalicoPressed(false);
                                        setPosInput('');
                                    }
                                }}>NO</button>
                                <button className={`m-btn btn-green-si ${(changeAmountDisplay !== null && changeAmountDisplay !== 'TARJETA_WAIT') || (isMetalicoPressed && posInput) || isDrawerOpen ? 'pulse-effect' : ''}`} onClick={() => {
                                    if (changeAmountDisplay === 'TARJETA_WAIT') return;

                                    if (isDrawerOpen) {
                                        setIsDrawerOpen(false);
                                        return;
                                    }

                                    if (isDescanso && descansoStep > 0) {
                                        if (descansoStep === 1) {
                                            if (posInput === '0101') {
                                                setDescansoStep(2);
                                                setPosInput('');
                                            } else {
                                                triggerError("ID INCORRECTO");
                                                setPosInput('');
                                            }
                                        } else if (descansoStep === 2) {
                                            if (posInput === '1111') {
                                                setIsDescanso(false);
                                                setDescansoStep(0);
                                                setPosInput('');
                                                triggerError("MODO VENTA 🛒");
                                            } else {
                                                triggerError("PIN INCORRECTO");
                                                setPosInput('');
                                            }
                                        }
                                        return;
                                    }
                                    if (isRetiradaPressed) {
                                        handleRetiradaNext();
                                        return;
                                    }
                                    if (isParkingConfirm) {
                                        finalizeAparcarTicket();
                                        return;
                                    }
                                    if (pendingParkedCart) {
                                        setPosCart(pendingParkedCart);
                                        fetch(`${API_BASE}/parked-sales/${pendingParkedId}`, { method: 'DELETE' });
                                        setPendingParkedCart(null);
                                        setPendingParkedId(null);
                                        triggerError("TICKET RECUPERADO ✅");
                                        return;
                                    }
                                    if (changeAmountDisplay !== null) finalizeSale(true);
                                    else if (isMetalicoPressed && posInput) {
                                        const given = parseFloat(posInput) / 100;
                                        if (!isNaN(given) && given >= cartTotal) {
                                            const change = given - cartTotal;
                                            setGivenAmount(given);
                                            setChangeAmountDisplay(change.toFixed(2));
                                            setPosInput('');
                                        } else {
                                            triggerError("CANTIDAD INSUFICIENTE");
                                        }
                                    } else if (posInput) {
                                        const found = products.find(p => p.barcode === posInput);
                                        if (found) addItemToCart(found);
                                        else {
                                            triggerError("EAN NO ENCONTRADO");
                                        }
                                        setPosInput('');
                                    } else {
                                        triggerError("INTRODUZCA DATOS");
                                    }
                                }}>SI</button>
                            </div>
                            <div className="matrix-col col-fin" onClickCapture={(e) => {
                                const isPaymentAction = e.target.classList.contains('btn-blue-pay') || e.target.classList.contains('btn-orange-sub') || e.target.classList.contains('btn-green-si') || e.target.classList.contains('btn-red-no');
                                if (changeAmountDisplay !== null && !isPaymentAction) {
                                    e.stopPropagation();
                                    triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
                                }
                            }}>
                                <button className="m-btn btn-purple" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className="m-btn btn-beige" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className="m-btn btn-beige" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className="m-btn btn-beige mini-txt" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className="m-btn btn-beige mini-txt" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className="m-btn btn-beige" style={{ visibility: (isSubtotalPressed || isDescanso) ? 'hidden' : 'visible' }}></button>
                                <button className={`m-btn btn-orange-sub ${posCart.length > 0 && !isSubtotalPressed ? 'pulse-effect' : ''}`} onClick={() => {
                                    if (posCart.length > 0) {
                                        setIsSubtotalPressed(true);
                                        setIsMetalicoPressed(false);
                                        setChangeAmountDisplay(null);
                                    }
                                }}>Subtotal</button>
                                <button className={`m-btn btn-blue-pay ${isSubtotalPressed && !isMetalicoPressed && changeAmountDisplay === null ? 'pulse-effect' : ''}`} style={{ background: '#39FF14', color: '#000', fontWeight: '950', visibility: isDescanso ? 'hidden' : 'visible' }} onClick={() => {
                                    if (isRetiradaPressed) {
                                        setIsRetiradaPressed(false);
                                        setRetiradaStep(1);
                                        setPosInput('');
                                        return;
                                    }
                                    if (isRetiradaPressed) {
                                        setIsRetiradaPressed(false);
                                        setRetiradaStep(1);
                                        setPosInput('');
                                        return;
                                    }
                                    if (changeAmountDisplay !== null) {
                                        triggerError("NO TIENES PERMISO PARA ESTE PROCESO. FINALICE O CANCELE EL COBRO.");
                                        return;
                                    }
                                    if (posCart.length > 0) setIsMetalicoPressed(true);
                                }}>Metálico</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BILL / CART (RIGHT) --- */}
                <div className="pos-bill-panel" style={{ visibility: isDescanso ? 'hidden' : 'visible' }}>
                    <div className="bill-ticket-scroll">
                        {posCart.length === 0 ? (
                            <div className="empty-cart-msg">
                                <span className="big-icon">🛒</span>
                                <p>CARRITO VACÍO</p>
                            </div>
                        ) : (
                            <table className="pos-bill-table">
                                <thead><tr><th>ARTÍCULO</th><th>P.U.</th><th>CAN</th><th>SUB</th><th></th></tr></thead>
                                <tbody>
                                    {posCart.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td>€{parseFloat(item.sell_price).toFixed(2)}</td>
                                            <td className="qty-cell">{item.qty}</td>
                                            <td>€{(parseFloat(item.sell_price) * item.qty).toFixed(2)}</td>
                                            <td><button className="del-item-pos" onClick={() => removeFromCart(item.id)}>×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="bill-footer-checkout">
                        <div className="checkout-extra-boxes" style={{ display: 'flex', gap: '8px' }}>
                            {isMetalicoPressed && posCart.length > 0 && !posInput && changeAmountDisplay === null ? (
                                [...suggestedCash, '', '', ''].slice(0, 3).map((amount, idx) => (
                                    amount !== '' ? (
                                        <button key={`sug-${idx}`} className="pulse-effect" onClick={() => {
                                            const change = amount - cartTotal;
                                            setChangeAmountDisplay(change.toFixed(2));
                                        }} style={{ width: '50px', height: '50px', borderRadius: '8px', border: '2px solid #0ea5e9', background: '#f0f9ff', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '950', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {amount}€
                                        </button>
                                    ) : (<button key={`emp-${idx}`} style={{ width: '50px', height: '50px', borderRadius: '8px', border: '1px dashed #ced4da', background: 'transparent' }}></button>)
                                ))
                            ) : (
                                <>
                                    <button style={{ width: '50px', height: '50px', borderRadius: '8px', border: '1px dashed #ced4da', background: 'transparent' }}></button>
                                    <button style={{ width: '50px', height: '50px', borderRadius: '8px', border: '1px dashed #ced4da', background: 'transparent' }}></button>
                                    <button style={{ width: '50px', height: '50px', borderRadius: '8px', border: '1px dashed #ced4da', background: 'transparent' }}></button>
                                </>
                            )}
                        </div>
                        <div className="total-black-box">€{cartTotal.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* --- SUB-MENU MODAL --- */}
            {activeSubMenu === 'panaderia' && (
                <div className="pos-submenu-overlay" onClick={() => setActiveSubMenu(null)}>
                    <div className="pos-submenu-modal-half animate-pop" onClick={e => e.stopPropagation()}>
                        <div className="submenu-header">
                            <img src={logo} alt="Carrefour" style={{ height: '20px' }} />
                            <h2 style={{ fontSize: '1.1rem' }}>🥖 PANADERÍA / BOLLERÍA</h2>
                            <span className="submenu-step-indicator">{subMenuLevel === 0 ? 'SELECCIONE CATEGORÍA' : selectedSubMenuCat}</span>
                        </div>
                        <div className="submenu-content-scrollable">
                            {subMenuLevel === 0 ? (
                                <div className="submenu-category-split">
                                    <button className="big-cat-box pan-bg" onClick={() => { setSelectedSubMenuCat('PAN'); setSubMenuLevel(1); }}>
                                        <span className="cat-icon">🥖</span>
                                        <span className="cat-label">PANADERÍA</span>
                                    </button>
                                    <button className="big-cat-box dulce-bg" onClick={() => { setSelectedSubMenuCat('BOLLERIA'); setSubMenuLevel(1); }}>
                                        <span className="cat-icon">🥐</span>
                                        <span className="cat-label">BOLLERÍA & DULCES</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="submenu-products-grid-compact">
                                    {products.filter(p => {
                                        if (selectedSubMenuCat === 'PAN') return p.category === 'PAN';
                                        return p.category === 'BOLLERIA' || p.category === 'BOLLERÍA' || p.category === 'DULCE';
                                    }).map(p => (
                                        <button key={p.id} className="sub-product-btn-compact" onClick={() => addItemToCart(p)}>
                                            <div className="sp-name">{p.name}</div>
                                            <div className="sp-price">€{parseFloat(p.sell_price).toFixed(2)}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="submenu-footer-nav">
                            <button className="nav-icon-btn" onClick={() => { if (subMenuLevel === 1) setSubMenuLevel(0); else setActiveSubMenu(null); }}>
                                <span className="icon">⬅️</span><span className="label">VOLVER</span>
                            </button>
                            <button className="nav-icon-btn" onClick={() => setActiveSubMenu(null)}>
                                <span className="icon">🏠</span><span className="label">HOME</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeSubMenu === 'bebidas' && (
                <div className="pos-submenu-overlay" onClick={() => setActiveSubMenu(null)}>
                    <div className="pos-submenu-modal-half animate-pop" onClick={e => e.stopPropagation()} style={{ height: 'auto', paddingBottom: '30px' }}>
                        <div className="submenu-header">
                            <img src={logo} alt="Carrefour" style={{ height: '20px' }} />
                            <h2 style={{ fontSize: '1.1rem' }}>🍹 SUPLEMENTO BEBIDA FRÍA</h2>
                            <button className="close-submenu" onClick={() => setActiveSubMenu(null)}>×</button>
                        </div>
                        <div className="cold-charge-options">
                            <button className="charge-box charge-box-square c-10" onClick={() => handleAddColdCharge(0.10, '0.10€')}>
                                <span className="c-icon">🥫</span><span className="c-val">+0.10€</span><span className="c-lbl">PEQUEÑA / LATA</span>
                            </button>
                            <button className="charge-box charge-box-square c-20" onClick={() => handleAddColdCharge(0.20, '0.20€')}>
                                <span className="c-icon">🍾</span><span className="c-val">+0.20€</span><span className="c-lbl">MEDIANA / 1L</span>
                            </button>
                            <button className="charge-box charge-box-square c-30" onClick={() => handleAddColdCharge(0.30, '0.30€')}>
                                <span className="c-icon">🛢️</span><span className="c-val">+0.30€</span><span className="c-lbl">GRANDE / 2L+</span>
                            </button>
                        </div>
                        <div className="submenu-footer-nav" style={{ marginTop: '20px' }}>
                            <button className="nav-icon-btn" onClick={() => setActiveSubMenu(null)}>
                                <span className="icon">🏠</span><span className="label">CANCELAR</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* --- SCREEN DIMMER FOR LONG BREAKS --- */}
            {isScreenDimmed && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.65)',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    transition: 'opacity 1s ease-in-out',
                    backdropFilter: 'blur(2px)'
                }}></div>
            )}
        </div>
    );
};

export default PosTerminal;
