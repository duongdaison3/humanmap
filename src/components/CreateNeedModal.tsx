import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { NeedRequest, NeedCategory } from '../types';
import { geminiService, ParsedNeed } from '../services/geminiService';
import { firebaseService } from '../services/firebaseService';
import { HANOI_CENTER } from '../data/mockData';
import { SafetyBadge } from './SafetyBadge';
import {
  X,
  ShieldAlert,
  Sparkles,
  Loader2,
  Mic,
  MicOff,
  Edit3,
  Check,
  AlertTriangle,
  RotateCcw,
  Compass,
  ArrowRight,
  MapPin,
  LocateFixed
} from 'lucide-react';

interface CreateNeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNeedCreated: (newNeed: NeedRequest) => void;
}

export const CreateNeedModal: React.FC<CreateNeedModalProps> = ({
  isOpen,
  onClose,
  onNeedCreated,
}) => {
  const [step, setStep] = useState<'input' | 'analyzing' | 'restricted' | 'interpreted' | 'error'>('input');
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [parsedNeed, setParsedNeed] = useState<ParsedNeed | null>(null);

  // Editable fields for user correction
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedCategory, setEditedCategory] = useState<NeedCategory>('directions');
  const [editedMinutes, setEditedMinutes] = useState(5);
  const [locationName, setLocationName] = useState('Phố Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội');
  const [selectedCoords, setSelectedCoords] = useState({ lat: HANOI_CENTER.lat, lng: HANOI_CENTER.lng });
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ name: string; address: string; lat: number; lng: number }>>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapPickerRef = useRef<HTMLDivElement | null>(null);
  const mapPickerInstanceRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setSelectedCoords(coords);
        setLocationName(`Vị trí hiện tại của bạn (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      },
      () => {
        setSelectedCoords({ lat: HANOI_CENTER.lat, lng: HANOI_CENTER.lng });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    );
  }, []);

  useEffect(() => {
    if (!showMapPicker || !mapPickerRef.current) return;

    const map = L.map(mapPickerRef.current, {
      center: [selectedCoords.lat, selectedCoords.lng],
      zoom: 16,
      zoomControl: true,
    });

    const tileLayer = L.tileLayer('/api/mapvina/tile/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; MapVina',
    });
    tileLayer.addTo(map);

    const marker = L.marker([selectedCoords.lat, selectedCoords.lng], { draggable: true }).addTo(map);
    selectedMarkerRef.current = marker;

    map.on('click', async (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      marker.setLatLng([lat, lng]);
      setSelectedCoords({ lat, lng });

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`);
        if (res.ok) {
          const data = await res.json();
          const address = data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setLocationName(address);
        } else {
          setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });

    marker.on('dragend', async () => {
      const position = marker.getLatLng();
      const next = { lat: position.lat, lng: position.lng };
      setSelectedCoords(next);

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${next.lat}&lon=${next.lng}&accept-language=vi`);
        if (res.ok) {
          const data = await res.json();
          const address = data?.display_name || `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
          setLocationName(address);
        } else {
          setLocationName(`${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
        }
      } catch {
        setLocationName(`${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
      }
    });

    mapPickerInstanceRef.current = map;

    return () => {
      map.remove();
      mapPickerInstanceRef.current = null;
      selectedMarkerRef.current = null;
    };
  }, [showMapPicker, selectedCoords.lat, selectedCoords.lng]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset state on close
    setStep('input');
    setPromptText('');
    setIsListening(false);
    setParsedNeed(null);
    setIsEditing(false);
    setErrorMessage(null);
    onClose();
  };

  // Sample prompt helpers for quick testing
  const samplePrompts = [
    'Tôi không biết đường đến ga.',
    'Bạn có thể dịch câu này sang tiếng Anh không?',
    'Tôi cần giúp tìm một hiệu thuốc gần đây.',
    'Mẹ tôi đang bất tỉnh.',
    'Tôi cần ai đó chuyển tiền cho tôi.'
  ];

  // Speech Recognition (Voice Input)
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói trực tiếp. Bạn có thể nhập bằng bàn phím.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setPromptText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Voice recognition error:', err);
      setIsListening(false);
    }
  };

  const mapCategoryToLocal = (catAI: string): NeedCategory => {
    switch (catAI) {
      case 'NAVIGATION': return 'directions';
      case 'TRANSLATION': return 'translation';
      case 'DIGITAL_ASSISTANCE': return 'phone_help';
      case 'LOCAL_INFORMATION': return 'pharmacy_find';
      case 'SIMPLE_GUIDANCE': return 'directions';
      case 'OTHER_SAFE_HELP': default: return 'other_safe';
    }
  };

  const mapCategoryLabel = (cat: NeedCategory): string => {
    switch (cat) {
      case 'directions': return 'Chỉ đường / Hướng dẫn';
      case 'translation': return 'Dịch thuật đơn giản';
      case 'phone_help': return 'Dùng điện thoại / App / QR';
      case 'pharmacy_find': return 'Địa điểm công cộng / Nhà thuốc';
      case 'public_place': return 'Bến xe / Điểm vệ sinh';
      default: return 'Trợ giúp nhỏ an toàn';
    }
  };

  const fetchLocationSuggestions = async (text: string) => {
    setIsFindingLocation(true);
    try {
      const params = new URLSearchParams({ query: text, location: locationName || 'Hà Nội' });
      const res = await fetch(`/api/places/search?${params.toString()}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.results)) {
        setLocationSuggestions(data.results.slice(0, 5));
        return data.results.slice(0, 5);
      }
      setLocationSuggestions([]);
      return [];
    } catch (error) {
      console.warn('Failed to fetch location suggestions:', error);
      setLocationSuggestions([]);
      return [];
    } finally {
      setIsFindingLocation(false);
    }
  };

  // Analyze Natural Language Request via Gemini AI
  const handleAnalyze = async (textToAnalyze?: string) => {
    const inputStr = textToAnalyze || promptText;
    if (!inputStr.trim()) return;

    setStep('analyzing');
    setErrorMessage(null);

    const res = await geminiService.parseNeed(inputStr.trim());

    if (!res.success || !res.data) {
      setStep('error');
      setErrorMessage(res.error || "I couldn't understand that clearly. Could you say it another way?");
      return;
    }

    const data = res.data;
    setParsedNeed(data);

    if (!data.safeForHumanMap || data.riskLevel === 'RESTRICTED') {
      setStep('restricted');
      return;
    }

    const localCat = mapCategoryToLocal(data.category);
    setEditedSummary(data.summary || data.intent || inputStr);
    setEditedCategory(localCat);
    setEditedMinutes(data.estimatedMinutes || 5);

    const intentHints = [
      data.category,
      data.summary,
      inputStr,
      'Hà Nội',
    ].filter(Boolean).join(' ');

    const suggestions = await fetchLocationSuggestions(intentHints);
    if (suggestions.length > 0) {
      const primary = suggestions[0];
      setLocationName(primary.address || primary.name);
      setSelectedCoords({ lat: primary.lat, lng: primary.lng });
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
            setSelectedCoords(coords);
            setLocationName(`Vị trí hiện tại của bạn (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          },
          () => {
            setLocationName('Phố Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội');
          }
        );
      }
    }

    setStep('interpreted');
  };

  // Submit Final Help Request
  const handleConfirmCreate = async () => {
    if (!parsedNeed) return;

    const user = await firebaseService.getCurrentUser();
    const finalTitle = editedSummary.trim() || parsedNeed.summary || promptText;
    const finalCategory = editedCategory;

    const created = await firebaseService.createNeedRequest({
      requesterName: user.name,
      requesterAvatar: user.avatar,
      requesterRole: user.role || 'Cư dân Hà Nội',
      title: finalTitle,
      description: promptText.trim() || finalTitle,
      category: finalCategory,
      categoryLabel: mapCategoryLabel(finalCategory),
      distanceMeters: 100,
      estMinutes: editedMinutes,
      locationName,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      safetyNote: parsedNeed.reasoningSummary || 'Micro-help an toàn nơi công cộng được AI phân tích.',
      safetyLevel: 'verified_safe',
      urgentLevel: 'normal',
    });

    onNeedCreated(created);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="clay-card relative w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col p-0 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="clay-btn-primary text-white font-extrabold text-xs px-3.5 py-1 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>AI Need Assistant</span>
            </span>
          </div>
          <button
            onClick={handleClose}
            className="clay-btn-dark p-1.5 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 overflow-y-auto space-y-4">
          <SafetyBadge />

          {/* STEP 1: Natural Language Input */}
          {step === 'input' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  Bạn cần trợ giúp điều gì xung quanh?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Diễn đạt tự nhiên bằng lời nói hoặc văn bản. Gemini AI sẽ thấu hiểu và chuyển thành hành động phù hợp.
                </p>
              </div>

              {/* Natural Language Input Box with Voice Button */}
              <div className="relative">
                <textarea
                  rows={4}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Ví dụ: Tôi đang ở gần đây nhưng không biết đường đến ga..."
                  className="clay-input w-full p-4 pr-14 text-sm text-slate-800 placeholder-slate-400 leading-relaxed"
                />

                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title="Nhập bằng giọng nói"
                  className={`absolute right-3 bottom-3.5 p-2.5 rounded-full transition-all cursor-pointer ${
                    isListening
                      ? 'clay-btn-primary animate-pulse'
                      : 'clay-btn-white text-slate-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Sample Prompts */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Thử các mẫu yêu cầu phổ biến:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPromptText(sample);
                        handleAnalyze(sample);
                      }}
                      className="clay-btn-white text-xs text-slate-700 hover:text-[#2563EB] px-3 py-1.5 font-bold transition-all text-left cursor-pointer"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit / Analyze CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!promptText.trim()}
                  onClick={() => handleAnalyze()}
                  className="clay-btn-primary w-full py-3.5 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Phân tích yêu cầu bằng AI</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Analyzing State */}
          {step === 'analyzing' && (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 clay-pill-blue text-[#2563EB]">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800">
                  Gemini AI đang thấu hiểu yêu cầu của bạn...
                </h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Xác định danh mục, ước tính thời gian và đánh giá kiểm duyệt an toàn
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Restricted / Safety Rejection */}
          {step === 'restricted' && parsedNeed && (
            <div className="clay-card-blue p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 clay-pill text-blue-700 shrink-0 mt-0.5">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-blue-950">
                    Không thể tạo yêu cầu này
                  </h4>
                  <p className="text-xs font-semibold text-blue-900 leading-relaxed">
                    Human Map is designed for small, low-risk acts of help and cannot facilitate this request.
                  </p>
                  <p className="text-xs text-blue-800 italic pt-1 border-t border-blue-200/60 mt-2 font-medium">
                    Lý do an toàn: {parsedNeed.reasoningSummary}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="clay-btn-primary px-4 py-2 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Thử lại yêu cầu khác</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Error State */}
          {step === 'error' && (
            <div className="clay-card-amber p-5 text-center space-y-3 animate-fade-in">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
              <div>
                <p className="font-bold text-sm text-amber-950">
                  {errorMessage || "I couldn't understand that clearly. Could you say it another way?"}
                </p>
                <p className="text-xs text-amber-800 mt-1 font-medium">
                  Tôi chưa hiểu rõ yêu cầu này. Bạn có thể diễn đạt lại theo cách khác không?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="clay-btn-white px-4 py-2 text-amber-900 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nhập lại yêu cầu</span>
              </button>
            </div>
          )}

          {/* STEP 5: Successfully Interpreted Result Screen */}
          {step === 'interpreted' && parsedNeed && (
            <div className="space-y-4 animate-fade-in">
              {/* You said / User Interpretation Header */}
              <div className="clay-card-blue p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Bạn đã nói (AI Interpretation):
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="clay-pill-blue text-xs text-[#2563EB] font-bold px-2.5 py-0.5 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Hoàn tất sửa' : 'Chỉnh sửa'}</span>
                  </button>
                </div>

                <p className="font-serif font-bold text-slate-900 text-base leading-snug">
                  "{parsedNeed.summary}"
                </p>

                {parsedNeed.reasoningSummary && (
                  <p className="text-[11px] text-slate-600 italic border-t border-blue-200/50 pt-2 font-medium">
                    {parsedNeed.reasoningSummary}
                  </p>
                )}
              </div>

              {/* Editable Fields / Summary Display */}
              {isEditing ? (
                <div className="clay-card p-4 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Tóm tắt tiêu đề
                    </label>
                    <input
                      type="text"
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      className="clay-input w-full p-2.5 font-medium text-slate-800 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Chủ đề
                    </label>
                    <select
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value as NeedCategory)}
                      className="clay-input w-full p-2.5 font-medium text-slate-800 outline-hidden"
                    >
                      <option value="directions">Chỉ đường / Hướng dẫn</option>
                      <option value="translation">Dịch thuật đơn giản</option>
                      <option value="phone_help">Dùng điện thoại / App / QR</option>
                      <option value="pharmacy_find">Địa điểm công cộng / Nhà thuốc</option>
                      <option value="other_safe">Trợ giúp nhỏ an toàn khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Thời gian ước tính (phút)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={editedMinutes}
                      onChange={(e) => setEditedMinutes(parseInt(e.target.value) || 5)}
                      className="clay-input w-full p-2.5 font-medium text-slate-800 outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                /* Structured Cards View */
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div className="clay-card-warm p-3 text-center">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Danh mục</span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {mapCategoryLabel(editedCategory)}
                    </span>
                  </div>

                  <div className="clay-card-amber p-3 text-center">
                    <span className="block text-[10px] text-amber-800/80 font-bold uppercase">Thời gian</span>
                    <span className="font-bold text-amber-900 block mt-0.5">
                      ~{editedMinutes} phút
                    </span>
                  </div>

                  <div className="clay-card-emerald p-3 text-center">
                    <span className="block text-[10px] text-emerald-800/80 font-bold uppercase">An toàn</span>
                    <span className="font-bold text-emerald-900 block mt-0.5 flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      Low-risk
                    </span>
                  </div>
                </div>
              )}

              {/* Location Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Vị trí công cộng
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker((prev) => !prev)}
                    className="clay-btn-white px-2.5 py-1 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    {showMapPicker ? 'Ẩn bản đồ' : 'Chọn trên bản đồ'}
                  </button>
                </div>

                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="clay-input w-full px-3.5 py-2.5 text-xs text-slate-800 font-bold"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((position) => {
                          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                          setSelectedCoords(coords);
                          setLocationName(`Vị trí hiện tại của bạn (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
                        });
                      }
                    }}
                    className="clay-btn-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <LocateFixed className="w-3 h-3" />
                    Dùng vị trí hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const text = `${editedCategory} ${locationName || promptText || 'Hà Nội'}`;
                      const results = await fetchLocationSuggestions(text);
                      if (results.length > 0) {
                        const primary = results[0];
                        setLocationName(`${primary.name} • ${primary.address}`);
                        setSelectedCoords({ lat: primary.lat, lng: primary.lng });
                      }
                    }}
                    className="clay-btn-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    {isFindingLocation ? 'Đang tìm...' : 'Tìm địa điểm chính xác'}
                  </button>
                </div>

                {locationSuggestions.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Địa điểm gợi ý</p>
                    <div className="space-y-1.5">
                      {locationSuggestions.map((place, idx) => (
                        <button
                          key={`${place.name}-${idx}`}
                          type="button"
                          onClick={() => {
                            setLocationName(`${place.name} • ${place.address}`);
                            setSelectedCoords({ lat: place.lat, lng: place.lng });
                            setLocationSuggestions([]);
                          }}
                          className="w-full text-left rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 hover:border-[#2563EB] hover:bg-blue-50 transition-all cursor-pointer"
                        >
                          <div className="text-[11px] font-bold text-slate-800">{place.name}</div>
                          <div className="text-[10px] text-slate-500">{place.address}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showMapPicker && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    <div ref={mapPickerRef} className="h-52 w-full rounded-xl" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="clay-btn-white py-3.5 px-5 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Nhập lại
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCreate}
                  className="clay-btn-primary flex-1 py-3.5 px-4 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Tạo Yêu Cầu Trợ Giúp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
