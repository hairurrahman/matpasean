import React, { useState, useEffect } from 'react';
import { Image, Plus, Trash2, Check, LayoutDashboard, GraduationCap, Lock, User, FileText, UploadCloud, AlertCircle, Clock, AlertTriangle } from 'lucide-react';

// TODO: MASUKKAN URL GOOGLE APPS SCRIPT ANDA DI SINI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQmMcDTKnEudR7ifkhX6wgSgv2sMsmIO673WLOXzifAHtaqGZ1DX1995ux0aFVmc3gDg/exec"; 

const DAFTAR_SEKOLAH = [
  "SD Plus Zainuddin", "SDF Al-Falah", "SDI Al-Haromain", "SDI Al-Munawaroh", 
  "SDI Integral Ulinnuha", "SDN Batokerbuy 2", "SDN Batukerbuy 1", "SDN Batukerbuy 3", 
  "SDN Batukerbuy 4", "SDN Batukerbuy 5", "SDN Bindang 1", "SDN Bindang 2", 
  "SDN Bindang 3", "SDN Dempo Barat 1", "SDN Dempo Barat 2", "SDN Dempo Timur 1", 
  "SDN Dempo Timur 2", "SDN Dempo Timur 3", "SDN Sana Daja 1", "SDN Sana Daja 2", 
  "SDN Sana Tengah 1", "SDN Sana Tengah 4", "SDN Sotabar 1", "SDN Sotabar 2", 
  "SDN Tagangser Daya 1", "SDN Tagangser Daya 2", "SDN Tlontoraja 1", "SDN Tlontoraja 2", 
  "SDN Tlontoraja 3", "SDN Tlontoraja 4", "SDN Tlontoraja 5", "SDN Tlontoraja 6", 
  "SDN Tlontoraja 7", "SDN Tlontoraja 8"
];

const formatImageUrl = (url) => {
  if (!url) return '';
  const driveMatch1 = url.match(/\/file\/d\/([-\w]+)/);
  const driveMatch2 = url.match(/id=([-\w]+)/);
  const id = (driveMatch1 && driveMatch1[1]) || (driveMatch2 && driveMatch2[1]);
  if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  return url; 
};

export default function App() {
  const [mode, setMode] = useState('student');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- KUSTOM POPUP MODAL (Pengganti alert bawaan) ---
  const [popup, setPopup] = useState(null); // { type: 'alert'|'confirm', title, message, onConfirm }

  const showAlert = (title, message) => setPopup({ type: 'alert', title, message });
  const showConfirm = (title, message, onConfirm) => setPopup({ type: 'confirm', title, message, onConfirm });

  // --- FETCH API SPREADSHEET ---
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!SCRIPT_URL) {
        setIsLoading(false);
        return; 
      }
      try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        setQuestions(data); 
      } catch (error) {
        console.error("Gagal mengambil data dari Spreadsheet:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  // --- STATE ADMIN ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  const [newQuestionType, setNewQuestionType] = useState('pg');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [newQuestionScore, setNewQuestionScore] = useState(10);
  const [newOptions, setNewOptions] = useState(['', '']);
  const [newCorrectAnswerPG, setNewCorrectAnswerPG] = useState(0);
  const [newCorrectAnswerPGK, setNewCorrectAnswerPGK] = useState([]);
  const [newStatements, setNewStatements] = useState([{ text: '', correct: 'B' }]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // --- STATE STUDENT ---
  const [isDataConfirmed, setIsDataConfirmed] = useState(false);
  const [studentData, setStudentData] = useState({
    nama: '', gender: 'Laki-laki', hari: '1', bulan: 'Januari', tahun: '2010', sekolah: '', token: ''
  });
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isSavingResult, setIsSavingResult] = useState(false);
  
  // Waktu Ujian (75 Menit = 4500 detik)
  const [timeLeft, setTimeLeft] = useState(75 * 60);

  // --- STATE ANTI KECURANGAN ---
  const [violationCount, setViolationCount] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);

  // --- TIMER EFFECT ---
  useEffect(() => {
    let timer;
    if (isDataConfirmed && !isSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft <= 0 && !isSubmitted && isDataConfirmed) {
      showAlert("Waktu Habis", "Waktu pengerjaan telah habis! Jawaban Anda akan dikirim otomatis.");
      calculateAndSubmit(true);
    }
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataConfirmed, isSubmitted, timeLeft, userAnswers, questions]); 
  // Menambahkan dependencies userAnswers & questions agar saat auto-submit data jawaban yang terkirim adalah data terbaru.

  // --- ANTI CHEAT EFFECT (Mendeteksi pindah Tab/Aplikasi) ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Jika dokumen menjadi tidak terlihat (pindah tab atau minimize) saat ujian berlangsung
      if (document.visibilityState === 'hidden' && isDataConfirmed && !isSubmitted && mode === 'student') {
        const newCount = violationCount + 1;
        setViolationCount(newCount);

        if (newCount >= 3) {
          setIsDisqualified(true);
          showAlert("DISKUALIFIKASI!", "Anda telah keluar dari halaman ujian 3 kali. Ujian dihentikan paksa dan data dikirim otomatis.");
          calculateAndSubmit(true); // Kirim paksa
        } else {
          showAlert(
            "PERINGATAN KECURANGAN!", 
            `Sistem mendeteksi Anda meninggalkan halaman ujian.\n\nPeringatan ke-${newCount} dari maksimal 3 kali pelanggaran. Jika mencapai 3 kali, Anda akan didiskualifikasi otomatis!`
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataConfirmed, isSubmitted, mode, violationCount, userAnswers, questions]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- FUNGSI ADMIN ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'pasean123') {
      setIsAdminLoggedIn(true);
    } else {
      showAlert("Login Gagal", "Username atau Password yang Anda masukkan Salah!");
    }
  };

  const handleAddOption = () => setNewOptions([...newOptions, '']);
  const handleRemoveOption = (index) => {
    const updated = newOptions.filter((_, i) => i !== index);
    setNewOptions(updated);
    if (newCorrectAnswerPG >= updated.length) setNewCorrectAnswerPG(0);
  };
  
  const handleAddStatement = () => setNewStatements([...newStatements, { text: '', correct: 'B' }]);
  const handleRemoveStatement = (index) => setNewStatements(newStatements.filter((_, i) => i !== index));

  const handleSaveQuestion = async () => {
    if (!newQuestionText.trim()) { showAlert("Peringatan", "Teks soal tidak boleh kosong!"); return; }
    if (!SCRIPT_URL) { showAlert("Peringatan", "Masukkan SCRIPT_URL terlebih dahulu di kode aplikasi!"); return; }

    setIsSavingQuestion(true);
    const newQuestion = {
      action: 'saveQuestion', 
      id: Date.now(),
      type: newQuestionType,
      text: newQuestionText,
      image: newQuestionImage,
      score: Number(newQuestionScore)
    };

    if (newQuestionType === 'pg') {
      newQuestion.options = newOptions;
      newQuestion.correctAnswer = newCorrectAnswerPG;
    } else if (newQuestionType === 'pgk') {
      newQuestion.options = newOptions;
      newQuestion.correctAnswer = newCorrectAnswerPGK;
    } else if (newQuestionType === 'bs') {
      newQuestion.statements = newStatements;
    }

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(newQuestion)
      });
      
      setQuestions([...questions, newQuestion]);
      
      setNewQuestionText(''); setNewQuestionImage(''); setNewOptions(['', '']);
      setNewCorrectAnswerPG(0); setNewCorrectAnswerPGK([]); setNewStatements([{ text: '', correct: 'B' }]);
      setNewQuestionScore(10);
      showAlert("Sukses", "Soal berhasil dikirim ke Spreadsheet!");
    } catch (error) {
      showAlert("Error", "Terjadi kesalahan sistem, pastikan Script URL benar.");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestionLocal = (id) => {
    showAlert("Info", "Hanya menghapus dari tampilan. Hapus baris di Google Sheet untuk menghapus permanen.");
    setQuestions(questions.filter(q => q.id !== id));
  };

  // --- FUNGSI STUDENT ---
  const handleStartTest = (e) => {
    e.preventDefault();
    if (!studentData.nama || !studentData.sekolah || !studentData.token) {
      showAlert("Perhatian", "Harap lengkapi semua data diri dan Token!"); return;
    }
    if (studentData.token.toUpperCase() !== "MAT123") {
      showAlert("Akses Ditolak", "Token Ujian Salah! Silakan tanyakan kepada pengawas."); return;
    }
    
    // Tampilkan Aturan Ujian sebelum mulai
    showConfirm(
      "Aturan Ujian (PENTING!)", 
      "1. Waktu pengerjaan 75 Menit.\n2. DILARANG keluar dari layar/tab browser (Membuka aplikasi lain, Minimize layar, atau pindah tab).\n3. Pelanggaran sistem ini maksimal 3 kali, lebih dari itu otomatis DIDISKUALIFIKASI.\n\nApakah Anda siap memulai?",
      () => {
        setIsDataConfirmed(true);
        setTimeLeft(75 * 60); // Reset timer ke 75 menit
        setViolationCount(0);
        setIsDisqualified(false);
      }
    );
  };

  const handleAnswerPG = (qId, optionIndex) => setUserAnswers({ ...userAnswers, [qId]: optionIndex });
  
  const handleAnswerPGK = (qId, optionIndex) => {
    const currentAns = userAnswers[qId] || [];
    let newAns = currentAns.includes(optionIndex) ? currentAns.filter(i => i !== optionIndex) : [...currentAns, optionIndex];
    setUserAnswers({ ...userAnswers, [qId]: newAns });
  };

  const handleAnswerBS = (qId, statementIndex, value) => {
    const currentAns = userAnswers[qId] || {};
    setUserAnswers({ ...userAnswers, [qId]: { ...currentAns, [statementIndex]: value } });
  };

  const processSubmission = async () => {
    setIsSavingResult(true);
    let totalScore = 0;
    
    questions.forEach(q => {
      const userAns = userAnswers[q.id];
      if (userAns === undefined) return; 
      
      const qScore = Number(q.score) || 10; 

      if (q.type === 'pg') {
        if (parseInt(userAns) === parseInt(q.correctAnswer)) totalScore += qScore;
      } 
      else if (q.type === 'pgk') {
        const optionsCount = (q.options || []).length || 1;
        const weightPerOption = qScore / optionsCount;
        
        if (userAns.length > 0) {
          (q.options || []).forEach((_, idx) => {
            const isUserChecked = userAns.includes(idx);
            const isCorrectChecked = (q.correctAnswer || []).includes(idx);
            if (isUserChecked === isCorrectChecked) totalScore += weightPerOption;
          });
        }
      } 
      else if (q.type === 'bs') {
        const statementsCount = (q.statements || []).length || 1;
        const weightPerStatement = qScore / statementsCount;
        
        if (Object.keys(userAns).length > 0) {
          (q.statements || []).forEach((stmt, idx) => {
            if (userAns[idx] === stmt.correct) totalScore += weightPerStatement;
          });
        }
      }
    });

    totalScore = Math.round(totalScore * 100) / 100;
    setScore(totalScore);

    if (SCRIPT_URL) {
      try {
        const payload = {
          action: 'saveResult',
          nama: studentData.nama,
          gender: studentData.gender,
          tglLahir: `${studentData.hari} ${studentData.bulan} ${studentData.tahun}`,
          sekolah: studentData.sekolah,
          token: studentData.token,
          score: isDisqualified ? 0 : totalScore // Jika diskualifikasi bisa dikirim skor 0 atau biarkan aslinya, disini biarkan asli
        };
        // Tambahkan keterangan diskualifikasi ke dalam nama jika terkena diskualifikasi
        if (isDisqualified) {
           payload.nama = `${studentData.nama} (DISKUALIFIKASI)`;
        }
        
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error("Gagal simpan skor", err);
      }
    }

    setIsSavingResult(false);
    setIsSubmitted(true);
  };

  const calculateAndSubmit = (isAutoSubmit = false) => {
    if (isAutoSubmit) {
      processSubmission();
    } else {
      showConfirm(
        "Selesaikan Ujian?", 
        "Apakah Anda yakin ingin menyelesaikan ujian sekarang? Jawaban yang sudah dikirim tidak bisa diubah lagi.",
        () => processSubmission()
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <GraduationCap size={56} className="text-blue-600 mb-4 animate-bounce" />
        <div className="text-xl font-bold text-blue-800 animate-pulse">Memuat Soal TKA</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans relative">
      {/* POPUP MODAL (Pengganti Alert/Confirm Bawaan Browser) */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center border-t-8 ${popup.type === 'confirm' ? 'border-blue-500' : 'border-red-500'} animate-in fade-in zoom-in duration-200`}>
            {popup.type === 'confirm' ? (
               <AlertCircle size={56} className="mx-auto text-blue-500 mb-4" />
            ) : (
               <AlertTriangle size={56} className="mx-auto text-red-500 mb-4" />
            )}
            
            <h3 className="text-2xl font-bold mb-3 text-gray-800">{popup.title}</h3>
            <p className="text-gray-600 mb-6 whitespace-pre-wrap leading-relaxed">{popup.message}</p>
            
            <div className="flex justify-center gap-3">
              {popup.type === 'confirm' && (
                <button onClick={() => setPopup(null)} className="flex-1 py-3 rounded-lg bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 transition">
                  Batal
                </button>
              )}
              <button 
                onClick={() => {
                  if (popup.onConfirm) popup.onConfirm();
                  setPopup(null);
                }} 
                className={`flex-1 py-3 rounded-lg text-white font-bold transition ${popup.type === 'confirm' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <GraduationCap size={28} />
          <h1 className="text-xl font-bold uppercase tracking-wider hidden sm:block">TRY OUT TKA Kec. Pasean</h1>
          <h1 className="text-xl font-bold uppercase tracking-wider sm:hidden">TO TKA</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {mode === 'student' && isDataConfirmed && !isSubmitted && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg shadow-inner ${timeLeft < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-900 text-blue-100'}`}>
              <Clock size={20} /> {formatTime(timeLeft)}
            </div>
          )}

          {(!isDataConfirmed || mode === 'admin') && (
            <div className="flex bg-blue-900 rounded-lg p-1">
              <button onClick={() => setMode('admin')} className={`px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${mode === 'admin' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:text-white'}`}>
                <LayoutDashboard size={16} /> <span className="hidden md:inline">Admin</span>
              </button>
              <button onClick={() => setMode('student')} className={`px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${mode === 'student' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:text-white'}`}>
                <User size={16} /> <span className="hidden md:inline">Peserta</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        
        {mode === 'admin' ? (
          /* AREA ADMIN (Tidak ada perubahan) */
          !isAdminLoggedIn ? (
            <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow border">
              <div className="text-center mb-6">
                <Lock size={48} className="mx-auto text-blue-800 mb-2" />
                <h2 className="text-2xl font-bold text-gray-800">Login Administrator</h2>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Username</label>
                  <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-3 border rounded focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Password</label>
                  <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-3 border rounded focus:ring-blue-500" required />
                </div>
                <button type="submit" className="w-full bg-blue-800 text-white font-bold py-3 rounded hover:bg-blue-900 transition">Masuk</button>
              </form>
            </div>
          ) : (
            <div className="space-y-8">
               {!SCRIPT_URL && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex gap-3 items-center">
                  <AlertCircle size={24}/>
                  <div><strong>Peringatan!</strong> SCRIPT_URL masih kosong.</div>
                </div>
              )}

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2 flex items-center gap-2">
                  <FileText size={24} className="text-blue-600"/> Buat Soal Baru
                </h2>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tipe Soal</label>
                      <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-lg">
                        <option value="pg">Pilihan Ganda (1 Jawaban)</option>
                        <option value="pgk">Pilihan Ganda Kompleks (Lebih dari 1 Jawaban)</option>
                        <option value="bs">Benar/Salah</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Bobot Score Soal Ini</label>
                      <input type="number" min="1" value={newQuestionScore} onChange={(e) => setNewQuestionScore(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-lg" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Pertanyaan</label>
                    <textarea rows="3" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-lg"></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Image size={16}/> URL Gambar (Link Google Drive)</label>
                    <input type="text" value={newQuestionImage} onChange={(e) => setNewQuestionImage(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-lg" placeholder="Pastikan akses file: Siapa saja yang memiliki link" />
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    {(newQuestionType === 'pg' || newQuestionType === 'pgk') && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                          Opsi Jawaban
                          <button onClick={handleAddOption} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"><Plus size={14} className="inline"/> Tambah</button>
                        </h3>
                        <div className="space-y-3">
                          {newOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              {newQuestionType === 'pg' ? (
                                <input type="radio" checked={newCorrectAnswerPG === idx} onChange={() => setNewCorrectAnswerPG(idx)} className="w-5 h-5 text-blue-600" />
                              ) : (
                                <input type="checkbox" checked={newCorrectAnswerPGK.includes(idx)} onChange={(e) => {
                                  if(e.target.checked) setNewCorrectAnswerPGK([...newCorrectAnswerPGK, idx]); else setNewCorrectAnswerPGK(newCorrectAnswerPGK.filter(i => i !== idx));
                                }} className="w-5 h-5 rounded text-blue-600" />
                              )}
                              <input type="text" value={opt} onChange={(e) => {
                                const updated = [...newOptions]; updated[idx] = e.target.value; setNewOptions(updated);
                              }} className="flex-1 p-2 border rounded" placeholder={`Opsi ${idx + 1}`} />
                              <button onClick={() => handleRemoveOption(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {newQuestionType === 'bs' && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                          Pernyataan
                          <button onClick={handleAddStatement} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"><Plus size={14} className="inline"/> Tambah</button>
                        </h3>
                        {newStatements.map((stmt, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded border mb-2">
                            <input type="text" value={stmt.text} onChange={(e) => {
                              const updated = [...newStatements]; updated[idx].text = e.target.value; setNewStatements(updated);
                            }} className="flex-1 p-2 border rounded text-sm" placeholder="Ketik pernyataan..." />
                            <label className="text-sm"><input type="radio" checked={stmt.correct === 'B'} onChange={() => {
                              const updated = [...newStatements]; updated[idx].correct = 'B'; setNewStatements(updated);
                            }} className="text-green-600"/> B</label>
                            <label className="text-sm"><input type="radio" checked={stmt.correct === 'S'} onChange={() => {
                              const updated = [...newStatements]; updated[idx].correct = 'S'; setNewStatements(updated);
                            }} className="text-red-600"/> S</label>
                            <button onClick={() => handleRemoveStatement(idx)} className="text-red-500 hover:bg-red-50 p-1"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={handleSaveQuestion} disabled={isSavingQuestion} className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 disabled:bg-gray-400 flex justify-center items-center gap-2">
                    {isSavingQuestion ? <span className="animate-pulse">Menyimpan...</span> : <><UploadCloud size={20} /> Simpan Langsung ke Spreadsheet</>}
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Soal yang Termuat ({questions.length})</h2>
                <div className="space-y-4">
                  {questions.map((q, index) => (
                    <div key={q.id || index} className="p-4 border rounded-lg flex justify-between">
                      <div>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded font-bold">No. {index + 1} | {q.type.toUpperCase()} | Score Total: {q.score || 10}</span>
                        <p className="font-medium mt-2">{q.text}</p>
                        {q.image && <img src={formatImageUrl(q.image)} alt="Preview" className="h-20 mt-2 object-contain border rounded" />}
                      </div>
                      <button onClick={() => handleDeleteQuestionLocal(q.id)} className="text-red-500 opacity-50 hover:opacity-100 p-1"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )

        ) : (
          <div className="max-w-4xl mx-auto">
            {!isDataConfirmed ? (
              <div className="bg-white p-8 rounded-xl shadow border border-blue-100">
                <div className="text-center mb-8 border-b pb-6">
                  <h2 className="text-2xl font-bold text-blue-900 uppercase">Konfirmasi Data Peserta</h2>
                  <p className="font-bold text-gray-700 mt-2 text-lg">TRY OUT MATEMATIKA</p>
                </div>
                
                <form onSubmit={handleStartTest} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap</label>
                    <input type="text" value={studentData.nama} onChange={e => setStudentData({...studentData, nama: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-lg uppercase" required />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Jenis Kelamin</label>
                    <select value={studentData.gender} onChange={e => setStudentData({...studentData, gender: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-lg">
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal Lahir</label>
                    <div className="grid grid-cols-3 gap-3">
                      <select value={studentData.hari} onChange={e => setStudentData({...studentData, hari: e.target.value})} className="p-3 bg-gray-50 border rounded-lg">
                        {[...Array(31)].map((_,i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                      </select>
                      <select value={studentData.bulan} onChange={e => setStudentData({...studentData, bulan: e.target.value})} className="p-3 bg-gray-50 border rounded-lg">
                        {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select value={studentData.tahun} onChange={e => setStudentData({...studentData, tahun: e.target.value})} className="p-3 bg-gray-50 border rounded-lg">
                        {[...Array(20)].map((_,i) => {
                          const year = new Date().getFullYear() - 5 - i;
                          return <option key={year} value={year}>{year}</option>
                        })}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Asal Sekolah</label>
                    <select 
                      value={studentData.sekolah} 
                      onChange={e => setStudentData({...studentData, sekolah: e.target.value})} 
                      className="w-full p-3 bg-gray-50 border rounded-lg uppercase" 
                      required
                    >
                      <option value="" disabled>-- PILIH ASAL SEKOLAH --</option>
                      {DAFTAR_SEKOLAH.map((sekolah, idx) => (
                        <option key={idx} value={sekolah}>{sekolah}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Token Ujian</label>
                    <input type="text" value={studentData.token} onChange={e => setStudentData({...studentData, token: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-lg uppercase tracking-widest font-mono text-center" required placeholder="MASUKKAN TOKEN" />
                  </div>

                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition mt-6 text-lg flex justify-center items-center gap-2">
                    MULAI UJIAN <Clock size={20}/> (75 Menit)
                  </button>
                </form>
              </div>

            ) : isSubmitted ? (
              <div className="bg-white p-8 rounded-xl shadow-md text-center border-t-8 border-green-500">
                
                {isDisqualified && (
                  <div className="bg-red-100 text-red-800 border-2 border-red-500 p-4 rounded-xl mb-6 font-bold flex flex-col items-center justify-center gap-2 shadow-sm">
                    <AlertTriangle size={32}/>
                    <span>ANDA TELAH DIDISKUALIFIKASI KARENA MELANGGAR ATURAN UJIAN (KELUAR DARI APLIKASI).</span>
                  </div>
                )}

                <Check size={64} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Ujian Selesai!</h2>
                <p className="text-gray-600 mb-6">Data Anda dan Hasil Ujian telah tersimpan di sistem.</p>
                
                <div className="inline-block bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8">
                  <p className="text-sm text-blue-800 font-semibold mb-1">Total Skor Anda</p>
                  <p className="text-6xl font-black text-blue-600">{score}</p>
                </div>
                
                <div className="text-left bg-gray-50 p-4 rounded-lg inline-block border text-sm w-full max-w-sm mx-auto">
                  <p><strong>Nama:</strong> {studentData.nama.toUpperCase()}</p>
                  <p><strong>Sekolah:</strong> {studentData.sekolah.toUpperCase()}</p>
                  {isDisqualified && <p className="text-red-600 font-bold mt-2">Status: DISKUALIFIKASI</p>}
                </div>
              </div>

            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                
                <div className="flex-1 bg-white p-6 sm:p-8 rounded-xl shadow-sm border relative">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">Soal No. {currentQIndex + 1}</span>
                    <span className="bg-red-50 text-red-600 border border-red-200 font-semibold px-3 py-1 rounded-full text-xs">
                       Pelanggaran: {violationCount}/3
                    </span>
                  </div>

                  {questions.length > 0 && questions[currentQIndex] && (
                    <>
                      <div className="mb-8 text-lg text-gray-800 leading-relaxed">
                        <p className="mb-4 whitespace-pre-line">{questions[currentQIndex].text}</p>
                        {questions[currentQIndex].image && (
                          <img src={formatImageUrl(questions[currentQIndex].image)} alt="Ilustrasi" className="max-w-full h-auto max-h-64 rounded-lg border object-contain mb-4" />
                        )}
                      </div>

                      <div className="mb-8">
                        {questions[currentQIndex].type === 'pg' && (
                          <div className="space-y-3">
                            {(questions[currentQIndex].options || []).map((opt, idx) => (
                              <label key={idx} className={`flex items-start p-4 rounded-lg border cursor-pointer transition ${userAnswers[questions[currentQIndex].id] === idx ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                                <input type="radio" checked={userAnswers[questions[currentQIndex].id] === idx} onChange={() => handleAnswerPG(questions[currentQIndex].id, idx)} className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="ml-3"><span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}</div>
                              </label>
                            ))}
                          </div>
                        )}
                        {questions[currentQIndex].type === 'pgk' && (
                          <div className="space-y-3">
                            <p className="text-sm text-blue-600 mb-3 font-semibold bg-blue-50 p-2 rounded inline-block">* Anda dapat memilih lebih dari satu jawaban.</p>
                            {(questions[currentQIndex].options || []).map((opt, idx) => {
                              const isChecked = (userAnswers[questions[currentQIndex].id] || []).includes(idx);
                              return (
                                <label key={idx} className={`flex items-start p-4 rounded-lg border cursor-pointer transition ${isChecked ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                                  <input type="checkbox" checked={isChecked} onChange={() => handleAnswerPGK(questions[currentQIndex].id, idx)} className="w-5 h-5 text-blue-600 rounded mt-0.5" />
                                  <div className="ml-3">{opt}</div>
                                </label>
                              )
                            })}
                          </div>
                        )}
                        {questions[currentQIndex].type === 'bs' && (
                          <table className="w-full text-left border-collapse border rounded-lg overflow-hidden block sm:table overflow-x-auto">
                            <thead>
                              <tr className="bg-gray-100"><th className="p-3 border">Pernyataan</th><th className="p-3 border text-center">Benar</th><th className="p-3 border text-center">Salah</th></tr>
                            </thead>
                            <tbody>
                              {(questions[currentQIndex].statements || []).map((stmt, idx) => {
                                const ans = (userAnswers[questions[currentQIndex].id] || {})[idx];
                                return (
                                  <tr key={idx} className="border-b transition hover:bg-gray-50">
                                    <td className="p-4">{stmt.text}</td>
                                    <td className="p-4 text-center bg-green-50/30 cursor-pointer" onClick={() => handleAnswerBS(questions[currentQIndex].id, idx, 'B')}>
                                      <input type="radio" checked={ans === 'B'} onChange={() => handleAnswerBS(questions[currentQIndex].id, idx, 'B')} className="w-5 h-5" />
                                    </td>
                                    <td className="p-4 text-center bg-red-50/30 cursor-pointer" onClick={() => handleAnswerBS(questions[currentQIndex].id, idx, 'S')}>
                                      <input type="radio" checked={ans === 'S'} onChange={() => handleAnswerBS(questions[currentQIndex].id, idx, 'S')} className="w-5 h-5" />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <button onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))} disabled={currentQIndex === 0} className={`px-4 py-2 font-medium ${currentQIndex === 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                      Sedang Sebelumnya
                    </button>
                    {currentQIndex === questions.length - 1 ? (
                      <button onClick={() => calculateAndSubmit(false)} disabled={isSavingResult} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 transition">
                        {isSavingResult ? 'Menyimpan...' : 'Selesai Ujian'}
                      </button>
                    ) : (
                      <button onClick={() => setCurrentQIndex(Math.min(questions.length - 1, currentQIndex + 1))} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition">
                        Berikutnya
                      </button>
                    )}
                  </div>
                </div>

                <div className="md:w-64 bg-white p-4 rounded-xl shadow border self-start sticky top-20">
                  <h3 className="font-bold mb-4 border-b pb-2">Daftar Soal</h3>
                  <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
                    {questions.map((q, idx) => {
                      let isAnswered = false;
                      const ans = userAnswers[q.id];
                      if (q.type === 'pg' && ans !== undefined) isAnswered = true;
                      if (q.type === 'pgk' && ans !== undefined && ans.length > 0) isAnswered = true;
                      if (q.type === 'bs' && ans !== undefined && Object.keys(ans).length === (q.statements?.length || 0)) isAnswered = true;

                      return (
                        <button key={idx} onClick={() => setCurrentQIndex(idx)} className={`w-10 h-10 rounded font-bold text-sm transition-transform hover:scale-105 ${currentQIndex === idx ? 'ring-2 ring-blue-600' : ''} ${isAnswered ? 'bg-blue-600 text-white' : 'bg-gray-100 border'}`}>
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
