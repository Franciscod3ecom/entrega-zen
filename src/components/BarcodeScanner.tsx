import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
}

export default function BarcodeScanner({ onScan, isActive }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const lastScannedRef = useRef<string>('');
  const lastDecodeTimeRef = useRef<number>(0);
  const [error, setError] = useState<string>('');
  
  const decodeThrottleMs = 200; // Processar apenas 1 frame a cada 200ms

  useEffect(() => {
    if (!isActive) {
      // Parar stream de vídeo
      if (controlsRef.current) {
        try {
          const stream = videoRef.current?.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (e) {
          console.log('Erro ao parar stream:', e);
        }
        controlsRef.current = null;
      }
      return;
    }

    // Iniciar scanner
    const startScanning = async () => {
      try {
        const codeReader = new BrowserMultiFormatReader();

        // Listar dispositivos de vídeo
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError('Nenhuma câmera encontrada');
          return;
        }

        // Tentar usar câmera traseira se disponível
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('traseira')
        );

        const selectedDeviceId = backCamera?.deviceId || videoInputDevices[0]?.deviceId;

        // Configurar stream com resolução otimizada para mobile
        const constraints = {
          video: {
            deviceId: selectedDeviceId,
            width: { ideal: 720 },
            height: { ideal: 480 },
            facingMode: backCamera ? 'environment' : 'user'
          }
        };

        // Iniciar decodificação contínua com throttle
        const controls = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, err) => {
            // Throttle: processar apenas a cada 200ms
            const now = Date.now();
            if (now - lastDecodeTimeRef.current < decodeThrottleMs) {
              return;
            }
            lastDecodeTimeRef.current = now;

            if (result) {
              console.time('[Scanner] Decodificação QR');
              const code = result.getText();
              
              // Evitar processar o mesmo código consecutivamente
              if (code !== lastScannedRef.current) {
                lastScannedRef.current = code;
                onScan(code);
                
                // Limpar após 3s para permitir re-escaneamento
                setTimeout(() => {
                  lastScannedRef.current = '';
                }, 3000);
              }
              console.timeEnd('[Scanner] Decodificação QR');
            }

            // Silenciosamente ignorar erros de "não encontrado"
            if (err && !err.message?.includes('NotFoundException')) {
              console.error('Erro no scanner:', err);
            }
          }
        );

        controlsRef.current = controls;

      } catch (err: any) {
        console.error('Erro ao iniciar scanner:', err);
        setError(err.message || 'Erro ao acessar câmera');
      }
    };

    startScanning();

    // Cleanup
    return () => {
      if (controlsRef.current) {
        try {
          const stream = videoRef.current?.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (e) {
          console.log('Erro ao limpar scanner:', e);
        }
        controlsRef.current = null;
      }
    };
  }, [isActive, onScan]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <p>{error}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Verifique as permissões de câmera
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg"
        playsInline
        muted
      />
      
      {/* Overlay de guia simplificado */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="border-2 border-primary rounded-lg w-48 h-48 opacity-80" />
      </div>

      {/* Instrução */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs">
          Posicione o QR no centro
        </span>
      </div>
    </div>
  );
}
