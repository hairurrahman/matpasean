import React, { useState, useEffect } from 'react';
import { Image, Plus, Trash2, Check, ChevronLeft, ChevronRight, Save, LayoutDashboard, GraduationCap, Lock, User, FileText, UploadCloud, AlertCircle } from 'lucide-react';

// TODO: MASUKKAN URL GOOGLE APPS SCRIPT ANDA DI SINI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz2XYhFXI37hbtLsMqMGyXChsGjnj842b5YTuFsl4sQe7hmebsM-qtzhbd5-vsWW3_WhA/exec"; 

export default function App() {
  const [mode, setMode] = useState('student'); // 'admin' atau 'student'
  
  // State Data Soal
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- MENGAMBIL DATA DARI SPREADSHEET (Fetch API) ---
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!SCRIPT_URL) {
        setIsLoading(false);
        return; // Hentikan jika URL belum diisi
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

  // --- STATE ADMIN (Auth & Pembuat Soal) ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  const [newQuestionType, setNewQuestionType] = useState('pg');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [newQuestionScore, setNewQuestionScore] = useState(10); // Default bobot nilai
  const [newOptions, setNewOptions] = useState(['', '']);
  const [newCorrectAnswerPG, setNewCorrectAnswerPG] = useState(0);
  const [newCorrectAnswerPGK, setNewCorrectAnswerPGK] = useState([]);
  const [newStatements, setNewStatements] = useState([{ text: '', correct: 'B' }]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // --- STATE STUDENT (Siswa Ujian) ---
  const [isDataConfirmed, setIsDataConfirmed] = useState(false);
  const [studentData, setStudentData] = useState({
    nama: '', gender: 'Laki-laki', hari: '1', bulan: 'Januari', tahun: '2010', sekolah: '', token: ''
  });
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isSavingResult, setIsSavingResult] = useState(false);

  // --- FUNGSI ADMIN ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    // HARDCODE Kredensial Admin
    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      setIsAdminLoggedIn(true);
    } else {
      alert("Username atau Password Salah!");
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
    if (!newQuestionText.trim()) { alert("Teks soal tidak boleh kosong!"); return; }
    if (!SCRIPT_URL) { alert("Masukkan SCRIPT_URL terlebih dahulu di kode aplikasi!"); return; }

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
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(newQuestion)
      });
      
      setQuestions([...questions, newQuestion]);
      
      setNewQuestionText(''); setNewQuestionImage(''); setNewOptions(['', '']);
      setNewCorrectAnswerPG(0); setNewCorrectAnswerPGK([]); setNewStatements([{ text: '', correct: 'B' }]);
      setNewQuestionScore(10);
      alert("Soal berhasil ditambahkan ke Spreadsheet!");
    } catch (error) {
      alert("Gagal menyimpan ke Spreadsheet. Periksa koneksi atau URL Script.");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestionLocal = (id) => {
    alert("Hanya menghapus dari tampilan. Untuk menghapus permanen, hapus baris di Spreadsheet Anda.");
    setQuestions(questions.filter(q => q.id !== id));
  };

  // --- FUNGSI STUDENT ---
  const handleStartTest = (e) => {
    e.preventDefault();
    if (!studentData.nama || !studentData.sekolah || !studentData.token) {
      alert("Harap lengkapi semua data dan Token!");
      return;
    }
    
    // --- VALIDASI TOKEN DI SINI ---
    // Token yang benar disetel menjadi: MATH123
    if (studentData.token.toUpperCase() !== "MATH123") {
      alert("Token Ujian Salah! Silakan hubungi admin / pengawas.");
      return;
    }
    
    setIsDataConfirmed(true);
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

  const calculateAndSubmit = async () => {
    if(!window.confirm("Apakah Anda yakin ingin menyelesaikan ujian? Data yang dikirim tidak bisa diubah.")) return;

    setIsSavingResult(true);
    let totalScore = 0;
    
    questions.forEach(q => {
      const userAns = userAnswers[q.id];
      if (userAns === undefined) return;
      
      const qScore = Number(q.score) || 10; 

      if (q.type === 'pg') {
        if (parseInt(userAns) === parseInt(q.correctAnswer)) totalScore += qScore;
      } else if (q.type === 'pgk') {
        const correctStr = [...q.correctAnswer].sort().toString();
        const userStr = [...userAns].sort().toString();
        if (correctStr === userStr) totalScore += qScore;
      } else if (q.type === 'bs') {
        let allStatementsCorrect = true;
        (q.statements || []).forEach((stmt, idx) => {
          if (userAns[idx] !== stmt.correct) allStatementsCorrect = false;
        });
        if (allStatementsCorrect && Object.keys(userAns).length === (q.statements || []).length) {
          totalScore += qScore;
        }
      }
    });

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
          score: totalScore
        };
        
        await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error("Gagal simpan skor", err);
        alert("Gagal menyimpan hasil ke database.");
      }
    }

    setIsSavingResult(false);
    setIsSubmitted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <GraduationCap size={56} className="text-blue-600 mb-4 animate-bounce" />
        <div className="text-xl font-bold text-blue-800 animate-pulse">Memuat Data TRY OUT...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <GraduationCap size={28} />
          <h1 className="text-xl font-bold uppercase tracking-wider">TRY OUT TKA Kec. Pasean</h1>
        </div>
        <div className="flex bg-blue-900 rounded-lg p-1">
          <button 
            onClick={() => setMode('admin')}
            className={`px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${mode === 'admin' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:text-white'}`}
          >
            <LayoutDashboard size={16} /> <span className="hidden sm:inline">Admin</span>
          </button>
          <button 
            onClick={() => setMode('student')}
            className={`px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${mode === 'student' ? 'bg-white text-blue-900 shadow' : 'text-blue-100 hover:text-white'}`}
          >
            <User size={16} /> <span className="hidden sm:inline">Peserta</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        
        {mode === 'admin' ? (
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
                  <div>
                    <strong>Peringatan!</strong> SCRIPT_URL masih kosong. Soal yang Anda buat tidak akan tersimpan ke Google Spreadsheet.
                  </div>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Image size={16}/> URL Gambar (Opsional)</label>
                    <input type="text" value={newQuestionImage} onChange={(e) => setNewQuestionImage(e.target.value)} className="w-full p-2.5 bg-gray-50 border rounded-lg" placeholder="https://..." />
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
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded font-bold">No. {index + 1} | {q.type.toUpperCase()} | Score: {q.score || 10}</span>
                        <p className="font-medium mt-2">{q.text}</p>
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
                    <input type="text" value={studentData.sekolah} onChange={e => setStudentData({...studentData, sekolah: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-lg uppercase" required placeholder="Contoh: SDN PASEAN 1" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Token Ujian</label>
                    <input type="text" value={studentData.token} onChange={e => setStudentData({...studentData, token: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-lg uppercase tracking-widest font-mono text-center" required placeholder="MASUKKAN TOKEN" />
                  </div>

                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition mt-6 text-lg">
                    MULAI UJIAN
                  </button>
                </form>
              </div>

            ) : isSubmitted ? (
              <div className="bg-white p-8 rounded-xl shadow-md text-center border-t-8 border-green-500">
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
                </div>
              </div>

            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                
                <div className="flex-1 bg-white p-6 sm:p-8 rounded-xl shadow-sm border relative">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">Soal No. {currentQIndex + 1}</span>
                  </div>

                  {questions.length > 0 && questions[currentQIndex] && (
                    <>
                      <div className="mb-8 text-lg text-gray-800 leading-relaxed">
                        <p className="mb-4 whitespace-pre-line">{questions[currentQIndex].text}</p>
                        {questions[currentQIndex].image && (
                          <img src={questions[currentQIndex].image} alt="Ilustrasi" className="max-w-full h-auto max-h-64 rounded-lg border object-contain mb-4" />
                        )}
                      </div>

                      <div className="mb-8">
                        {questions[currentQIndex].type === 'pg' && (
                          <div className="space-y-3">
                            {(questions[currentQIndex].options || []).map((opt, idx) => (
                              <label key={idx} className={`flex items-start p-4 rounded-lg border cursor-pointer ${userAnswers[questions[currentQIndex].id] === idx ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                                <input type="radio" checked={userAnswers[questions[currentQIndex].id] === idx} onChange={() => handleAnswerPG(questions[currentQIndex].id, idx)} className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="ml-3"><span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}</div>
                              </label>
                            ))}
                          </div>
                        )}
                        {questions[currentQIndex].type === 'pgk' && (
                          <div className="space-y-3">
                            <p className="text-sm text-blue-600 mb-3 font-semibold">* Anda dapat memilih lebih dari satu jawaban.</p>
                            {(questions[currentQIndex].options || []).map((opt, idx) => {
                              const isChecked = (userAnswers[questions[currentQIndex].id] || []).includes(idx);
                              return (
                                <label key={idx} className={`flex items-start p-4 rounded-lg border cursor-pointer ${isChecked ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
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
                                  <tr key={idx} className="border-b">
                                    <td className="p-4">{stmt.text}</td>
                                    <td className="p-4 text-center bg-green-50/30"><input type="radio" checked={ans === 'B'} onChange={() => handleAnswerBS(questions[currentQIndex].id, idx, 'B')} className="w-5 h-5" /></td>
                                    <td className="p-4 text-center bg-red-50/30"><input type="radio" checked={ans === 'S'} onChange={() => handleAnswerBS(questions[currentQIndex].id, idx, 'S')} className="w-5 h-5" /></td>
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
                      <button onClick={calculateAndSubmit} disabled={isSavingResult} className="bg-green-600 text-white px-6 py-2 rounded font-bold">
                        {isSavingResult ? 'Menyimpan...' : 'Selesai Ujian'}
                      </button>
                    ) : (
                      <button onClick={() => setCurrentQIndex(Math.min(questions.length - 1, currentQIndex + 1))} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">
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
                        <button key={idx} onClick={() => setCurrentQIndex(idx)} className={`w-10 h-10 rounded font-bold text-sm ${currentQIndex === idx ? 'ring-2 ring-blue-600' : ''} ${isAnswered ? 'bg-blue-600 text-white' : 'bg-gray-100 border'}`}>
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