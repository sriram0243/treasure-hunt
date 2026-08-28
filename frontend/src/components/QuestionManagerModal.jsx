import React, { useEffect, useState } from 'react';
import { HelpCircle, Plus, Trash2, Edit3, CheckCircle2, AlertCircle, X, Save, RotateCcw } from 'lucide-react';
import { api } from '../api/client';

export default function QuestionManagerModal({ isOpen, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State for Add/Edit
  const [editingId, setEditingId] = useState(null); // null for new, string for edit
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
    }
  }, [isOpen]);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuestions();
      if (res.success) {
        setQuestions(res.questions || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaultQuestions = async () => {
    if (!window.confirm('Are you sure you want to reset all Stage 7 questions to the 10 new default AI riddles?')) return;
    setLoading(true);
    try {
      const res = await api.resetQuestions();
      if (res.success) {
        setSuccessMsg('Successfully reset all questions to the 10 new AI riddles!');
        fetchQuestions();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.error || 'Failed to reset questions.');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setShowForm(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleOpenEditForm = (q) => {
    setEditingId(q._id);
    setQuestionText(q.question_text || '');
    setOptions(q.options && q.options.length === 4 ? [...q.options] : ['', '', '', '']);
    setCorrectIndex(q.correct_option_index !== undefined ? q.correct_option_index : 0);
    setShowForm(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setError('Please enter question text.');
      return;
    }
    if (options.some(opt => !opt.trim())) {
      setError('Please fill in all 4 option fields.');
      return;
    }

    try {
      const payload = {
        question_text: questionText.trim(),
        options: options.map(o => o.trim()),
        correct_option_index: parseInt(correctIndex)
      };

      let res;
      if (editingId) {
        res = await api.updateQuestion(editingId, payload);
      } else {
        res = await api.addQuestion(payload);
      }

      if (res.success) {
        setSuccessMsg(editingId ? 'Question updated successfully!' : 'New question added successfully!');
        setShowForm(false);
        fetchQuestions();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.error || 'Failed to save question.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const res = await api.deleteQuestion(id);
      if (res.success) {
        setSuccessMsg('Question deleted successfully.');
        fetchQuestions();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete question.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto pb-safe">
      <div className="w-full max-w-4xl bg-[#0D261E] border-2 border-[#F59E0B] rounded-3xl p-5 md:p-8 shadow-2xl space-y-6 relative text-left my-auto max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-amber-200">
                STAGE 7 QUIZ QUESTIONS MANAGER
              </h3>
              <p className="text-xs text-emerald-300">
                Manage 10-Question Stage 7 Final Quiz (Total Questions: {questions.length})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-900/60 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-xl font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs rounded-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Bar */}
        {!showForm && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800">
            <span className="text-xs text-amber-300 font-bold">
              Teams must solve all questions correctly to unlock Stage 7 QR scanning.
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaultQuestions}
                className="px-3 py-2 bg-emerald-900 hover:bg-emerald-800 text-amber-300 border border-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET 10 AI RIDDLES</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-[#071912] text-xs font-black rounded-xl shadow-md transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ADD NEW QUESTION</span>
              </button>
            </div>
          </div>
        )}

        {/* Form for Add / Edit */}
        {showForm && (
          <form onSubmit={handleSaveQuestion} className="p-5 bg-emerald-950/90 border border-amber-500/60 rounded-2xl space-y-4 shadow-lg">
            <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
              {editingId ? 'Edit Quiz Question' : 'Add New Quiz Question'}
            </h4>

            <div>
              <label className="block text-xs font-bold text-amber-200 mb-1">Question Text *</label>
              <textarea
                rows={2}
                required
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter the quiz question text..."
                className="w-full bg-emerald-900/60 border border-emerald-700 rounded-xl p-3 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-amber-200">
                4 Answer Options (Select radio button for Correct Answer) *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-emerald-900/40 p-2 rounded-xl border border-emerald-800">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={correctIndex === idx}
                      onChange={() => setCorrectIndex(idx)}
                      className="accent-amber-500 w-4 h-4 cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-extrabold text-amber-400 shrink-0 w-6">
                      {['A', 'B', 'C', 'D'][idx]}:
                    </span>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${['A', 'B', 'C', 'D'][idx]}`}
                      className="w-full bg-emerald-950 border border-emerald-700 rounded-lg px-3 py-1.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-[#071912] text-xs font-black rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>SAVE QUESTION</span>
              </button>
            </div>
          </form>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-amber-300 animate-pulse">
            LOADING QUESTIONS LIST...
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q._id}
                className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-extrabold text-[11px] rounded-lg border border-amber-500/30">
                      Q{idx + 1}
                    </span>
                    <h5 className="text-xs font-bold text-amber-100 whitespace-pre-line">{q.question_text}</h5>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = q.correct_option_index === oIdx;
                      return (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg border truncate ${
                            isCorrect
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 font-bold'
                              : 'bg-emerald-900/30 text-emerald-300 border-emerald-900'
                          }`}
                        >
                          <span>{['A', 'B', 'C', 'D'][oIdx]}: {opt}</span>
                          {isCorrect && <span className="ml-1 text-amber-400">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditForm(q)}
                    className="p-2 bg-emerald-900 hover:bg-emerald-800 text-amber-300 rounded-xl border border-emerald-700 transition text-xs font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q._id)}
                    className="p-2 bg-red-950 hover:bg-red-900 text-red-300 rounded-xl border border-red-800 transition text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
