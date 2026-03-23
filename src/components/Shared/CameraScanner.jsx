import React, { useState, useRef, useEffect } from 'react';

const CameraScanner = ({ onScan }) => {
  const [hasError, setHasError] = useState(false);
  const [errorHeader, setErrorHeader] = useState("CÁMARA NO DISPONIBLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef(null);
  const scannerLoopRef = useRef(null);
  const [activeEngine, setActiveEngine] = useState("Iniciando...");

  useEffect(() => {
    let mounted = true;
    let stream = null;
    let quaggaRunning = false;

    const stopScanner = async () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      if (quaggaRunning) {
        try {
          const Quagga = (await import('@ericblade/quagga2')).default;
          Quagga.stop();
        } catch (e) { }
        quaggaRunning = false;
      }
      if (scannerLoopRef.current) cancelAnimationFrame(scannerLoopRef.current);
    };

    const handleSuccess = (code) => {
      if (!mounted) return;
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.12);
      } catch (e) { }
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

      onScan(code);
      stopScanner();
    };

    const start = async () => {
      try {
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
          setErrorHeader("⚠️ CONEXIÓN NO SEGURA");
          setErrorMsg("Chrome/Android requiere HTTPS para usar la cámara. Por favor usa HTTPS.");
          setHasError(true);
          return;
        }

        // Keep constraints simple; aggressive advanced constraints can cause Safari to reject/ignore sizing
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        });

        if (!mounted) return stopScanner();
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Give the camera a tiny moment to auto-focus naturally before CPU load
        setTimeout(async () => {
          if (!mounted) return;
          if ('BarcodeDetector' in window) {
            const detector = new window.BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e']
            });
            setActiveEngine("NATIVE SENSOR (ULTRA FAST) ⚡");

            let lastDetectionTime = 0;
            const loop = async (time) => {
              if (!mounted || !videoRef.current) return;
              // Android Native Engine can handle 60fps checks smoothly
              if (time - lastDetectionTime > 15) {
                if (videoRef.current.readyState >= 2) {
                  try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                      return handleSuccess(barcodes[0].rawValue);
                    }
                  } catch (e) { }
                }
                lastDetectionTime = time;
              }
              scannerLoopRef.current = requestAnimationFrame(loop);
            };
            scannerLoopRef.current = requestAnimationFrame(loop);
          } else {
            setActiveEngine("QUAGGA2 SCANNER (iOS COMPATIBLE) 🔍");
            const Quagga = (await import('@ericblade/quagga2')).default;
            Quagga.init({
              inputStream: {
                name: "Live",
                type: "LiveStream",
                target: videoRef.current,
                constraints: {
                  facingMode: "environment",
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  aspectRatio: { min: 1, max: 2 }
                }
              },
              locator: {
                patchSize: "medium", // 'medium' is the best sweet spot for EAN on retail products
                halfSample: true     // CRITICAL FOR iOS! Safari chokes on 720p 60fps full-sample math!
              },
              decoder: {
                readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader"]
              },
              locate: true,
              numOfWorkers: navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 4) : 2, // Safe worker cap for iOS
              frequency: 15 // 15 checks a sec is completely CPU-safe but very fast perception
            }, (err) => {
              if (err) { setHasError(true); return; }
              if (mounted) { Quagga.start(); quaggaRunning = true; }
            });

            let lastCode = '';
            let lastCodeCount = 0;
            Quagga.onDetected((res) => {
              const code = res?.codeResult?.code;
              if (!code) return;
              // Very strict match on at least 2 hits ensures no false positives but high speed
              if (code === lastCode) { lastCodeCount++; } else { lastCode = code; lastCodeCount = 1; }
              if (lastCodeCount >= 2) {
                handleSuccess(code);
                lastCode = '';
                lastCodeCount = 0;
              }
            });
          }
          setIsScanning(true);
        }, 400); // 400ms warmup delay for iOS natural autofocus
      } catch (err) {
        setHasError(true);
        setErrorMsg("Sin acceso a cámara o permiso denegado.");
      }
    };

    start();
    return () => { mounted = false; stopScanner(); };
  }, []);

  const toggleTorch = async () => {
    try {
      if (!videoRef.current?.srcObject) return;
      const track = videoRef.current.srcObject.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch (e) { }
  };

  if (hasError) {
    return (
      <div className="camera-err" style={{ background: '#fff', padding: '30px', textAlign: 'center', borderRadius: '20px' }}>
        <p style={{ fontWeight: 900, color: '#E1000F' }}>{errorHeader}</p>
        <p style={{ fontSize: '12px' }}>{errorMsg}</p>
        <button onClick={() => window.location.reload()} style={{ background: '#003986', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', marginTop: '10px' }}>REINTENTAR</button>
      </div>
    );
  }

  return (
    <div className="camera-viewport-v3" style={{ position: 'relative', background: '#000', width: '100%', height: '350px', borderRadius: '25px', overflow: 'hidden' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '950', zIndex: 10 }}>
        {activeEngine}
      </div>
      <div className="scan-laser-container">
        <div className="laser-beam"></div>
        <div className="corner tr"></div><div className="corner tl"></div><div className="corner br"></div><div className="corner bl"></div>
      </div>
      <button onClick={toggleTorch} style={{
        position: 'absolute', bottom: '20px', right: '20px', width: '50px', height: '50px', borderRadius: '50%',
        background: torchOn ? '#FFD700' : 'rgba(255,255,255,0.2)', border: 'none', fontSize: '24px', zIndex: 10
      }}>{torchOn ? '🔦' : '💡'}</button>
      <style>{`
        .scan-laser-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; align-items: center; justify-content: center; }
        .laser-beam { width: 85%; height: 3px; background: #ff0000; box-shadow: 0 0 15px #f00; animation: moveLaser 3s infinite ease-in-out; }
        @keyframes moveLaser { 0%, 100% { transform: translateY(-70px); opacity: 0.2; } 50% { transform: translateY(70px); opacity: 1; } }
        .corner { position: absolute; width: 30px; height: 30px; border: 4px solid #16A34A; border-radius: 8px; }
        .tl { top: 25%; left: 15%; border-right: none; border-bottom: none; }
        .tr { top: 25%; right: 15%; border-left: none; border-bottom: none; }
        .bl { bottom: 25%; left: 15%; border-right: none; border-top: none; }
        .br { bottom: 25%; right: 15%; border-left: none; border-top: none; }
      `}</style>
    </div>
  );
};

export default CameraScanner;
