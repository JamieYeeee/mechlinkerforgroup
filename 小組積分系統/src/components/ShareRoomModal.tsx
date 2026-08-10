import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { syncEngine } from '../utils/syncEngine';
import { X, QrCode as QrIcon, Copy, Check, Smartphone, LogIn, Sparkles } from 'lucide-react';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({ isOpen, onClose, roomId }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [newRoomInput, setNewRoomInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}?room=${roomId}` : '';

  useEffect(() => {
    if (isOpen && roomId) {
      QRCode.toDataURL(currentUrl, { width: 260, margin: 2 }, (err, url) => {
        if (!err) {
          setQrDataUrl(url);
        }
      });
    }
  }, [isOpen, roomId, currentUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomInput.trim()) return;
    syncEngine.setRoomId(newRoomInput.trim());
    setNewRoomInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg">多支手機同步連線</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-center">
          <div>
            <p className="text-xs text-slate-500 mb-2">
              請用其他手機鏡頭掃描下方 QR Code，即可加入同一個房間同步加分：
            </p>
            {qrDataUrl ? (
              <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200 shadow-md my-1">
                <img src={qrDataUrl} alt="Room QR Code" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                載入 QR Code 中...
              </div>
            )}
            <p className="text-xs font-mono font-bold text-indigo-600 mt-1">
              當前房間代碼：<span className="text-sm bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">{roomId}</span>
            </p>
          </div>

          {/* Share Link Copy */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-700">專屬連結：</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0 shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '已複製' : '複製連結'}</span>
              </button>
            </div>
          </div>

          {/* Switch / Create Room Input */}
          <div className="pt-3 border-t border-slate-100 text-left space-y-2">
            <label className="block text-xs font-bold text-slate-700">切換或建立新房間代碼：</label>
            <form onSubmit={handleSwitchRoom} className="flex gap-2">
              <input
                type="text"
                value={newRoomInput}
                onChange={(e) => setNewRoomInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
                placeholder="例如: CAMP2026"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>切換</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
