import React, { useState, useEffect } from 'react';
import { NeedRequest, Story, HelpSession, UserProfile } from '../types';
import { geminiService, HumanStoryData } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { SafetyBadge } from './SafetyBadge';
import { SessionStatusCard } from './SessionStatusCard';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Heart, 
  Sparkles, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Send, 
  BookOpen, 
  X, 
  Loader2, 
  Eye, 
  EyeOff, 
  Mic, 
  MicOff, 
  Edit3, 
  Trash2, 
  Lock,
  UserCheck
} from 'lucide-react';

interface HelpFlowProps {
  need: NeedRequest;
  onClose: () => void;
  onCompleteAndSaveStory: (newStory: Story) => void;
}

type FlowStep = 'confirm' | 'active' | 'complete' | 'input_reflection' | 'preview_story';

export const HelpFlow: React.FC<HelpFlowProps> = ({
  need,
  onClose,
  onCompleteAndSaveStory,
}) => {
  const [step, setStep] = useState<FlowStep>('confirm');
  const [agreedChecklist, setAgreedChecklist] = useState<boolean>(false);
  const [activeSeconds, setActiveSeconds] = useState<number>(0);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<HelpSession | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function initSession() {
      const user = await dataService.getCurrentUser();
      setCurrentUser(user);
      const active = await dataService.getActiveSession();
      if (active && active.requestId === need.id) {
        setCurrentSession(active);
      }
    }
    initSession();
  }, [need.id]);
  
  // Phase 5 Story State
  const [userReflection, setUserReflection] = useState<string>('');
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [privacyOption, setPrivacyOption] = useState<'anonymous' | 'first_name' | 'public'>('anonymous');
  const [isEditingPreview, setIsEditingPreview] = useState<boolean>(false);
  const [storyPreview, setStoryPreview] = useState<HumanStoryData>({
    title: '',
    summary: '',
    quote: '',
    body: '',
    theme: 'Lòng tốt quanh ta',
    locationLabel: need.locationName ? `Gần ${need.locationName.split(',')[0]}` : 'Phố Cổ, Hoàn Kiếm',
    privacySuggestion: 'anonymous',
  });

  const [chatHistory, setChatHistory] = useState<Array<{ sender: string; text: string }>>([
    { sender: need.requesterName, text: `Cảm ơn bạn! Mình đang đứng gần ${need.locationName.split(',')[0]}.` }
  ]);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);

  // Timer tick for active helping state
  useEffect(() => {
    let interval: any = null;
    if (step === 'active') {
      interval = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Start Help Action
  const handleStartHelp = async () => {
    setStep('active');
    await dataService.updateNeedStatus(need.id, 'in_progress');
    const user = await dataService.getCurrentUser();
    const interaction = await dataService.createInteraction(need.id, need.requesterName, user.name);
    setInteractionId(interaction.id);

    try {
      const session = await dataService.createHelpSession({
        requestId: need.id,
        requesterId: need.requesterId || 'requester_anon',
        helperId: user.id || 'helper_curr',
        needTitle: need.title,
        requesterName: need.requesterName,
        helperName: user.name,
        locationName: need.locationName,
      });
      setCurrentSession(session);
    } catch (err) {
      console.warn('Could not create HelpSession state machine session:', err);
    }
  };

  // Handle Complete Help action
  const handleFinishHelp = async () => {
    setStep('complete');
    await dataService.updateNeedStatus(need.id, 'completed');
    if (interactionId) {
      await dataService.updateInteractionStatus(interactionId, 'completed');
    }
    await dataService.incrementUserHelpedCount();
  };

  // Generate Story from User Reflection (Phase 5 Engine)
  const handleGenerateStoryFromReflection = async (reflectionText?: string) => {
    const textToUse = reflectionText !== undefined ? reflectionText : userReflection;
    setIsDrafting(true);
    const user = await dataService.getCurrentUser();
    
    const result = await geminiService.generateHumanStory(
      textToUse,
      need.title,
      need.locationName,
      need.requesterName,
      user.name
    );

    setStoryPreview(result);
    if (result.privacySuggestion === 'first_name') setPrivacyOption('first_name');
    else setPrivacyOption('anonymous');

    setIsDrafting(false);
    setStep('preview_story');
  };

  // Voice Input Simulation Trigger
  const handleVoiceInputToggle = () => {
    if (isVoiceListening) {
      setIsVoiceListening(false);
    } else {
      setIsVoiceListening(true);
      // Simulate speech recognition result after 1.5s
      setTimeout(() => {
        const voiceText = "Tôi giúp một bác tìm ga Hà Nội. Bác nói bác ở phố này từ năm 1986.";
        setUserReflection(voiceText);
        setIsVoiceListening(false);
      }, 1500);
    }
  };

  // Handle Publish Story (Explicit user confirmation required in preview mode)
  const handlePublishStory = async () => {
    const user = await dataService.getCurrentUser();
    
    // Privacy resolution
    let authorName = 'Người dân ẩn danh';
    let authorAvatar: string | undefined = undefined;
    let isAnon = true;

    if (privacyOption === 'first_name') {
      authorName = user.name ? user.name.split(' ')[0] : 'Thành viên';
      authorAvatar = user.avatar;
      isAnon = false;
    } else if (privacyOption === 'public') {
      authorName = user.name || 'Thành viên Human Map';
      authorAvatar = user.avatar;
      isAnon = false;
    }

    const newStory = await dataService.createStory({
      interactionId: interactionId || undefined,
      title: storyPreview.title || `Khoảnh khắc hỗ trợ tại ${need.locationName.split(',')[0]}`,
      quote: storyPreview.quote || '',
      body: storyPreview.body || storyPreview.summary,
      authorName,
      authorAvatar,
      isAnonymous: isAnon,
      authorVisibility: privacyOption,
      locationName: storyPreview.locationLabel || need.locationName,
      distanceMeters: need.distanceMeters,
      lat: need.lat,
      lng: need.lng,
      theme: storyPreview.theme || 'Lòng tốt quanh ta',
    });

    onCompleteAndSaveStory(newStory);
    onClose();
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setChatHistory((prev) => [...prev, { sender: 'Bạn', text: chatMessage }]);
    setChatMessage('');
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        { sender: need.requesterName, text: 'Đã nhận tin nhắn! Mình chờ bạn ở khu vực nhé.' }
      ]);
    }, 1000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg clay-card shadow-[0_25px_60px_rgba(0,0,0,0.3)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Step 1: Confirmation & Safety Checklist */}
        {step === 'confirm' && (
          <div className="p-6 space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <span className="clay-pill-emerald px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Xác nhận Safe Micro-Help
              </span>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900 mb-1">
                Sẵn sàng hỗ trợ {need.requesterName}?
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Hãy dành khoảng ~{need.estMinutes} phút để giúp đỡ trong khu vực {need.locationName.split(',')[0]}.
              </p>
            </div>

            {/* Task summary */}
            <div className="clay-card-warm p-4.5 text-xs text-slate-800 space-y-2">
              <h4 className="font-serif font-bold text-sm text-[#2563EB]">{need.title}</h4>
              <p className="leading-relaxed text-slate-700 font-medium">{need.description}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-[#2563EB]">
                <span>📍 ~{need.distanceMeters}m ({need.locationName.split(',')[0]})</span>
                <span>⏱️ ~{need.estMinutes} phút</span>
              </div>
            </div>

            {/* Safety checklist checkbox */}
            <div className="clay-card p-4 space-y-2.5">
              <p className="text-xs font-bold text-slate-800">Cam kết an toàn trước khi bắt đầu:</p>
              <label className="flex items-start gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedChecklist}
                  onChange={(e) => setAgreedChecklist(e.target.checked)}
                  className="mt-0.5 rounded text-[#2563EB] focus:ring-[#2563EB] w-4 h-4 cursor-pointer"
                />
                <span className="leading-tight">
                  Tôi đồng ý gặp mặt tại địa điểm công cộng thoáng đãng, giữ giao tiếp lịch sự, không giao dịch tiền mặt hay tài sản.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="clay-btn-white px-5 py-3 text-slate-600 text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={!agreedChecklist}
                onClick={handleStartHelp}
                className={`flex-1 py-3 px-4 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  agreedChecklist
                    ? 'clay-btn-primary text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none rounded-2xl'
                }`}
              >
                <span>Xác nhận & Bắt đầu giúp đỡ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Active Helping State */}
        {step === 'active' && (
          <div className="p-6 space-y-5 overflow-y-auto">
            {currentSession && (
              <SessionStatusCard
                session={currentSession}
                currentUser={currentUser}
                onUpdateSession={(updated) => {
                  setCurrentSession(updated);
                  if (updated.status === 'COMPLETED') {
                    handleFinishHelp();
                  }
                }}
                onCompleteSession={() => handleFinishHelp()}
                onCloseSession={onClose}
              />
            )}
            {/* Top Status */}
            <div className="clay-card-emerald p-4 flex items-center justify-between">
              <div>
                <span className="clay-pill-emerald text-[10px] font-extrabold tracking-wider px-2.5 py-0.5 inline-block mb-1">
                  🟢 ĐANG TRỢ GIÚP
                </span>
                <h3 className="text-sm font-serif font-bold text-slate-900">Đang tới gặp {need.requesterName}</h3>
                <p className="text-xs text-emerald-800 font-bold mt-0.5">{need.locationName}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-extrabold text-emerald-800 block">
                  {formatTime(activeSeconds)}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">Thời gian trôi qua</span>
              </div>
            </div>

            {/* Micro Guidance Steps */}
            <div className="clay-card-warm p-4 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Hướng dẫn nhanh:</h4>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-medium leading-relaxed">
                <li>Đi bộ khoảng <strong>~{need.distanceMeters}m</strong> đến điểm hẹn.</li>
                <li>Hỏi thăm nhẹ nhàng và hỗ trợ {need.categoryLabel.toLowerCase()}.</li>
                <li>Nụ cười và sự kiên nhẫn là món quà quý giá nhất!</li>
              </ol>
            </div>

            {/* Quick message simulation */}
            <div className="clay-card p-4 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nhắn tin nhanh với người cần giúp
              </p>
              <div className="max-h-28 overflow-y-auto space-y-1.5 p-2.5 clay-card-warm text-xs">
                {chatHistory.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl max-w-[85%] text-xs font-medium ${
                      m.sender === 'Bạn'
                        ? 'clay-btn-primary text-white ml-auto'
                        : 'clay-card text-slate-800'
                    }`}
                  >
                    <span className="block text-[9px] opacity-90 font-bold">{m.sender}</span>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Nhập tin nhắn..."
                  className="clay-input flex-1 px-3.5 py-2 text-xs font-medium text-slate-800"
                />
                <button
                  onClick={handleSendMessage}
                  className="clay-btn-dark p-2.5 text-white cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Finish CTA */}
            <button
              onClick={handleFinishHelp}
              className="clay-btn-emerald w-full py-3.5 px-4 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Đã hoàn thành giúp đỡ</span>
            </button>
          </div>
        )}

        {/* Step 3: Complete Celebration */}
        {step === 'complete' && (
          <div className="p-8 text-center space-y-5 animate-scale-up">
            <div className="w-20 h-20 clay-pill-emerald rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Heart className="w-10 h-10 fill-emerald-600 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900 mb-1">
                Cảm ơn bạn vì lòng tốt hôm nay!
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                Hành động nhỏ của bạn tại {need.locationName.split(',')[0]} đã làm không gian Phố Cổ trở nên ấm áp và gần gũi hơn.
              </p>
            </div>

            {isDrafting ? (
              <div className="p-4.5 clay-card-warm flex items-center justify-center gap-2 text-xs text-[#2563EB] font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                <span>AI Gemini đang tạo gợi ý câu chuyện đẹp cho khoảnh khắc này...</span>
              </div>
            ) : (
              <div className="clay-card-warm p-4.5 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB]">
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <span>Lưu giữ khoảnh khắc thành câu chuyện?</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Lưu lại kỷ niệm đẹp này để truyền cảm hứng trợ giúp cho cộng đồng người dân & du khách quanh bạn.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => setStep('input_reflection')}
                className="clay-btn-primary w-full py-3.5 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-200" />
                <span>Lưu khoảnh khắc thành câu chuyện</span>
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Bỏ qua & Về trang chủ
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Input Reflection (Phase 5 Human Story Engine) */}
        {step === 'input_reflection' && (
          <div className="p-6 space-y-4 overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#2563EB]" />
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-base">Lưu Giữ Kỷ Niệm</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Phase 5: Human Story Engine</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="clay-card-warm p-3.5 space-y-1 text-xs text-slate-800">
              <span className="font-bold text-[#2563EB] block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Nguyên tắc chân thực:
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Gemini sẽ giúp sắp xếp, chau chuốt câu từ. AI tuyệt đối <strong>không tự tạo thêm sự thật, tuổi tác, cảm xúc hay trích dẫn hư cấu</strong>.
              </p>
            </div>

            {/* Test Case Quick Fill Chip */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Thử nghiệm mẫu (Test Case Prompt)
              </span>
              <button
                type="button"
                onClick={() => setUserReflection("I helped a man find the train station. He told me he has lived here since 1986.")}
                className="w-full p-3 text-left text-xs clay-card-warm text-slate-800 font-medium transition-all cursor-pointer flex items-center justify-between group"
              >
                <span>"I helped a man find the train station. He told me he has lived here since 1986."</span>
                <span className="text-[10px] font-bold text-[#2563EB] group-hover:underline">Dùng mẫu</span>
              </button>
            </div>

            {/* Reflection Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">Cảm nhận / Kỷ niệm ngắn của bạn</label>
                <button
                  type="button"
                  onClick={handleVoiceInputToggle}
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                    isVoiceListening
                      ? 'clay-btn-primary text-white animate-pulse'
                      : 'clay-btn-white text-slate-700'
                  }`}
                >
                  {isVoiceListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-[#2563EB]" />}
                  <span>{isVoiceListening ? 'Đang lắng nghe...' : '🎙️ Giọng nói'}</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={userReflection}
                onChange={(e) => setUserReflection(e.target.value)}
                placeholder="Ví dụ: Tôi vừa giúp một bác tìm nhà ga. Bác chia sẻ bác đã sống ở con phố này từ năm 1986..."
                className="clay-input w-full px-3.5 py-2.5 text-xs font-medium text-slate-800 leading-relaxed"
              />
            </div>

            <button
              onClick={() => handleGenerateStoryFromReflection()}
              disabled={isDrafting}
              className="clay-btn-primary w-full py-3.5 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isDrafting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Gemini đang chuẩn hóa câu chuyện...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Tạo & Xem trước câu chuyện với Gemini</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 5: Story Preview & Privacy Selection (Phase 5) */}
        {step === 'preview_story' && (
          <div className="p-6 space-y-4 overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#2563EB]" />
                  Xem Trước Câu Chuyện (Story Preview)
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Kiểm tra trước khi xuất bản lên Human Map</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editorial Story Preview Card */}
            <div className="clay-card-warm p-4 sm:p-5 space-y-3 relative shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
                <span className="clay-pill-amber px-2.5 py-0.5">{storyPreview.theme || 'Lòng tốt quanh ta'}</span>
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3 text-[#2563EB]" />
                  {storyPreview.locationLabel}
                </span>
              </div>

              {/* Title */}
              {isEditingPreview ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Tiêu đề</label>
                  <input
                    type="text"
                    value={storyPreview.title}
                    onChange={(e) => setStoryPreview({ ...storyPreview, title: e.target.value })}
                    className="clay-input w-full px-3 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>
              ) : (
                <h2 className="font-serif font-bold text-slate-900 text-lg sm:text-xl leading-tight">
                  {storyPreview.title}
                </h2>
              )}

              {/* Quote Rule Box */}
              {storyPreview.quote ? (
                isEditingPreview ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Trích dẫn trực tiếp</label>
                    <input
                      type="text"
                      value={storyPreview.quote}
                      onChange={(e) => setStoryPreview({ ...storyPreview, quote: e.target.value })}
                      className="clay-input w-full px-3 py-1.5 text-xs font-serif italic text-slate-900"
                    />
                  </div>
                ) : (
                  <blockquote className="font-serif italic text-xs sm:text-sm text-[#2563EB] clay-card p-3 leading-relaxed">
                    "{storyPreview.quote}"
                  </blockquote>
                )
              ) : (
                <p className="text-[10px] text-slate-400 italic clay-card p-2">
                  (Không có trích dẫn trực tiếp - Tuân thủ quy tắc không tự tạo câu nói)
                </p>
              )}

              {/* Body */}
              {isEditingPreview ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Nội dung</label>
                  <textarea
                    rows={4}
                    value={storyPreview.body}
                    onChange={(e) => setStoryPreview({ ...storyPreview, body: e.target.value })}
                    className="clay-input w-full px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {storyPreview.body || storyPreview.summary}
                </p>
              )}
            </div>

            {/* Privacy Selector (Section 6 Privacy Rule) */}
            <div className="clay-card p-4 space-y-2.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Quyền riêng tư tác giả (Privacy)</span>
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Mặc định ẩn danh
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPrivacyOption('anonymous')}
                  className={`py-2 px-2 rounded-2xl font-bold transition-all text-center cursor-pointer ${
                    privacyOption === 'anonymous'
                      ? 'clay-btn-dark text-white'
                      : 'clay-btn-white text-slate-600'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5 mx-auto mb-1 text-amber-200" />
                  <span className="text-[11px] block">Ẩn danh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrivacyOption('first_name')}
                  className={`py-2 px-2 rounded-2xl font-bold transition-all text-center cursor-pointer ${
                    privacyOption === 'first_name'
                      ? 'clay-btn-primary text-white'
                      : 'clay-btn-white text-slate-600'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 mx-auto mb-1 text-white" />
                  <span className="text-[11px] block">Chỉ tên gọi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrivacyOption('public')}
                  className={`py-2 px-2 rounded-2xl font-bold transition-all text-center cursor-pointer ${
                    privacyOption === 'public'
                      ? 'clay-btn-emerald text-white'
                      : 'clay-btn-white text-slate-600'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 mx-auto mb-1 text-white" />
                  <span className="text-[11px] block">Họ tên đầy đủ</span>
                </button>
              </div>
            </div>

            {/* Action Buttons: Publish / Edit / Discard */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handlePublishStory}
                className="clay-btn-primary w-full py-3.5 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Xuất bản câu chuyện (Publish Story)</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsEditingPreview(!isEditingPreview)}
                  className="clay-btn-white flex-1 py-2.5 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{isEditingPreview ? 'Hoàn tất chỉnh sửa' : 'Chỉnh sửa'}</span>
                </button>

                <button
                  onClick={onClose}
                  className="clay-btn-white flex-1 py-2.5 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bỏ qua (Discard)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
