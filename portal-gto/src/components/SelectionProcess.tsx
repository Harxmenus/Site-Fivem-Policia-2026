import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  User,
  MessageSquare,
  Calendar,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Shield,
  Award,
  Send,
  RefreshCw,
} from 'lucide-react';
import { QuestionItem } from '../types';

interface SelectionProcessProps {
  questions: QuestionItem[];
}

export default function SelectionProcess({ questions }: SelectionProcessProps) {
  const [step, setStep] = useState<'register' | 'quiz' | 'submitting' | 'result'>('register');

  // Registration State
  const [formData, setFormData] = useState({
    name: '',
    discordTag: '',
    age: '',
    passport: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quiz State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Result State
  const [testResult, setTestResult] = useState<{
    score: number;
    passed: boolean;
    total: number;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome completo é obrigatório.';
    if (!formData.discordTag.trim())
      newErrors.discordTag = 'Discord ID é obrigatório para contato.';
    if (!formData.age.trim() || isNaN(Number(formData.age)))
      newErrors.age = 'Idade válida é obrigatória.';
    if (!formData.passport.trim()) newErrors.passport = 'Passaporte (ID) é obrigatório.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const startQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setAnswers(new Array(questions.length).fill(-1));
      setCurrentQuestionIdx(0);
      setSelectedOption(null);
      setStep('quiz');
    }
  };

  const handleSelectOption = (idx: number) => {
    setSelectedOption(idx);
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIdx] = idx;
    setAnswers(updatedAnswers);
  };

  const handleNextQuestion = () => {
    if (selectedOption === null && answers[currentQuestionIdx] === -1) {
      alert('Por favor, selecione uma resposta antes de prosseguir.');
      return;
    }

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      // Load previous selection if any
      setSelectedOption(
        answers[currentQuestionIdx + 1] !== -1 ? answers[currentQuestionIdx + 1] : null
      );
    } else {
      submitTest();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
      setSelectedOption(answers[currentQuestionIdx - 1]);
    }
  };

  const submitTest = async () => {
    setStep('submitting');
    try {
      const response = await fetch('/api/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          answers,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar teste.');
      }

      const data = await response.json();
      setTestResult({
        score: data.score,
        passed: data.passed,
        total: data.total,
      });
      setStep('result');
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao enviar sua ficha de inscrição. Tente novamente.');
      setStep('quiz');
    }
  };

  const restartProcess = () => {
    setFormData({
      name: '',
      discordTag: '',
      age: '',
      passport: '',
    });
    setAnswers([]);
    setSelectedOption(null);
    setTestResult(null);
    setStep('register');
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden"
      id="processo-seletivo"
    >
      {/* Red accent badge for a tactical look */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold font-mono bg-red-950 text-red-400 border border-red-900/60 rounded">
              RECRUTAMENTO ATIVO
            </span>
            <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold font-mono bg-slate-800 text-slate-300 rounded">
              15 QUESTÕES
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="text-red-500 w-7 h-7" /> Processo Seletivo GTO
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Ficha de Inscrição e Teste Tático de Conhecimento Doutrinário
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-amber-400">
                  Aviso importante para Candidatos:
                </span>{' '}
                Este processo seletivo avalia sua capacidade analítica, estabilidade psicológica e
                domínio básico das doutrinas táticas do GTO. É obrigatório acertar pelo menos{' '}
                <strong className="text-white">11 de 15 questões (70%)</strong> para ser
                pré-aprovado. Candidatos pré-aprovados serão convocados via Discord para a fase
                prática e Teste de Aptidão Física (TAF).
              </div>
            </div>

            <form onSubmit={startQuiz} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-red-500" /> Nome Completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Roberto Silva Albuquerque"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-red-500" /> Discord ID
                </label>
                <input
                  type="text"
                  name="discordTag"
                  value={formData.discordTag}
                  onChange={handleInputChange}
                  placeholder="Ex: roberto_tactical"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                />
                <p className="text-[10px] text-slate-500">
                  Necessário para receber sua convocação oficial.
                </p>
                {errors.discordTag && <p className="text-xs text-red-500">{errors.discordTag}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-red-500" /> Idade
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Ex: 27"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                />
                {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-red-500" /> Passaporte (ID)
                </label>
                <input
                  type="text"
                  name="passport"
                  value={formData.passport}
                  onChange={handleInputChange}
                  placeholder="Ex: 1042"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  O seu número de identificador único dentro da cidade (ID).
                </p>
                {errors.passport && <p className="text-xs text-red-500">{errors.passport}</p>}
              </div>

              <div className="col-span-1 md:col-span-2 pt-4">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-xl px-6 py-4 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/40 border border-red-500/30 transition-all"
                >
                  Iniciar Teste Tático de Admissão <ChevronRight size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 'quiz' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>
                  QUESTÃO {currentQuestionIdx + 1} DE {questions.length}
                </span>
                <span className="text-red-400 font-bold">
                  {Math.round((currentQuestionIdx / questions.length) * 100)}% COMPLETO
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-red-500 h-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Box */}
            <div className="bg-slate-950/70 rounded-2xl p-6 border border-slate-800/80 space-y-6">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-start gap-3">
                <span className="bg-red-950 text-red-400 font-mono text-sm px-2.5 py-1 rounded shrink-0 border border-red-900/60">
                  {currentQuestionIdx + 1}
                </span>
                <span className="leading-relaxed">{questions[currentQuestionIdx]?.question}</span>
              </h3>

              {/* Options */}
              <div className="space-y-3">
                {questions[currentQuestionIdx]?.options.map((opt, oIdx) => {
                  const isSelected =
                    selectedOption === oIdx || answers[currentQuestionIdx] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`w-full text-left rounded-xl p-4 border transition-all flex items-start gap-3 cursor-pointer group ${
                        isSelected
                          ? 'bg-red-950/40 border-red-500/80 text-white'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-mono text-xs border font-bold transition-all ${
                          isSelected
                            ? 'bg-red-500 border-red-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 group-hover:border-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="text-sm pt-0.5 leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handlePrevQuestion}
                disabled={currentQuestionIdx === 0}
                className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 rounded-xl hover:bg-slate-950 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                Voltar anterior
              </button>

              <button
                onClick={handleNextQuestion}
                disabled={selectedOption === null && answers[currentQuestionIdx] === -1}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl px-6 py-3 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIdx === questions.length - 1 ? (
                  <>
                    Finalizar Inscrição <Send size={14} />
                  </>
                ) : (
                  <>
                    Próxima questão <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'submitting' && (
          <motion.div
            key="submitting"
            className="py-16 flex flex-col items-center justify-center space-y-4"
          >
            <RefreshCw className="text-red-500 animate-spin w-12 h-12" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Processando Teste Tático...
            </h3>
            <p className="text-slate-400 text-sm max-w-md text-center">
              Avaliando sua pontuação, registrando sua ficha no banco tático e estabelecendo
              transmissão para o canal do Discord do GTO...
            </p>
          </motion.div>
        )}

        {step === 'result' && testResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Visual Grade Box */}
            <div
              className={`rounded-2xl border p-6 md:p-8 text-center space-y-4 shadow-xl relative overflow-hidden ${
                testResult.passed
                  ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-100'
                  : 'bg-red-950/20 border-red-900/60 text-red-100'
              }`}
            >
              {/* Corner abstract visual background */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 blur-2xl rounded-full opacity-20 ${
                  testResult.passed ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />

              <div className="flex justify-center">
                {testResult.passed ? (
                  <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20">
                    <CheckCircle className="text-emerald-500 w-16 h-16" />
                  </div>
                ) : (
                  <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                    <XCircle className="text-red-500 w-16 h-16" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full font-mono ${
                    testResult.passed
                      ? 'bg-emerald-900/60 text-emerald-400'
                      : 'bg-red-900/60 text-red-400'
                  }`}
                >
                  {testResult.passed ? 'APROVADO NA TRIAGEM' : 'REPROVADO NA DOUTRINA'}
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  {formData.name}
                </h3>
                <p className="text-slate-300 max-w-xl mx-auto text-sm leading-relaxed">
                  {testResult.passed ? (
                    <>
                      Excelente aproveitamento! Você acertou{' '}
                      <strong className="text-emerald-400">{testResult.score} de 15</strong>{' '}
                      questões e alcançou a nota de{' '}
                      <strong className="text-emerald-400">
                        {Math.round((testResult.score / testResult.total) * 100)}%
                      </strong>
                      . Suas credenciais foram encaminhadas com sucesso para o comando.
                    </>
                  ) : (
                    <>
                      Infelizmente, seu índice foi insuficiente. Você acertou{' '}
                      <strong className="text-red-400">{testResult.score} de 15</strong> questões
                      (nota{' '}
                      <strong className="text-red-400">
                        {Math.round((testResult.score / testResult.total) * 100)}%
                      </strong>
                      ), ficando abaixo do exigido (mínimo de 11 acertos).
                    </>
                  )}
                </p>
              </div>

              {/* Stats pill */}
              <div className="flex justify-center gap-4 py-2">
                <div className="bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-xl font-mono text-center">
                  <span className="block text-[10px] text-slate-500 uppercase">Pontuação</span>
                  <span className="text-lg font-bold text-white">
                    {testResult.score} / {testResult.total}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-xl font-mono text-center">
                  <span className="block text-[10px] text-slate-500 uppercase">Mínimo Exigido</span>
                  <span className="text-lg font-bold text-slate-300">11 (70%)</span>
                </div>
              </div>

              {testResult.passed ? (
                <div className="bg-emerald-950/50 border border-emerald-800/40 p-4 rounded-xl text-left text-xs text-emerald-200 leading-relaxed max-w-2xl mx-auto flex items-start gap-2">
                  <Award className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-1">Próximos passos:</strong>
                    Sua ficha está ativa. Fique atento às suas mensagens privadas no{' '}
                    <span className="underline font-bold">Discord</span> fornecido (
                    {formData.discordTag}). O comando do GTO entrará em contato para agendar o exame
                    médico e o teste físico (corrida, barra fixa, flexão e natação). Mantenha o
                    treinamento ativo!
                  </div>
                </div>
              ) : (
                <div className="bg-red-950/40 border border-red-900/20 p-4 rounded-xl text-left text-xs text-red-300 leading-relaxed max-w-2xl mx-auto flex items-start gap-2">
                  <HelpCircle className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-1">Orientação de estudo:</strong>
                    Para ingressar no GTO é necessário espírito de corpo impecável, conhecimento
                    analítico minucioso do procedimento operacional padrão e resiliência
                    psicológica. Estude as explicações técnicas listadas abaixo, reforce seu
                    conhecimento e tente novamente quando se sentir preparado.
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Review */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold tracking-wider uppercase text-slate-300 flex items-center gap-2">
                <FileText size={16} className="text-red-500" /> Gabarito Técnico Revisado
              </h4>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const candidateAns = answers[idx];
                  const correctAns = q.answerIndex;
                  const isCorrect = candidateAns === correctAns;

                  return (
                    <div
                      key={q.id}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 space-y-3 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <span className="bg-slate-900 text-slate-400 border border-slate-800 text-xs font-mono px-2 py-0.5 rounded shrink-0">
                          Questão {idx + 1}
                        </span>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 uppercase font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/60">
                            <CheckCircle size={12} /> Correto
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 uppercase font-mono bg-red-950/40 px-2 py-0.5 rounded border border-red-900/60">
                            <XCircle size={12} /> Incorreto
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-bold text-white leading-relaxed">{q.question}</h5>

                      {/* Show option comparison */}
                      <div className="text-xs space-y-2">
                        <div
                          className={`p-2.5 rounded-lg flex items-start gap-2 ${
                            isCorrect
                              ? 'bg-emerald-950/30 text-emerald-300'
                              : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          <strong className="text-slate-400 shrink-0 font-mono">
                            Sua resposta:
                          </strong>
                          <span>{q.options[candidateAns] || '(Não respondido)'}</span>
                        </div>

                        {!isCorrect && (
                          <div className="p-2.5 rounded-lg bg-emerald-950/30 text-emerald-300 flex items-start gap-2">
                            <strong className="text-emerald-400 shrink-0 font-mono">
                              Correta:
                            </strong>
                            <span>{q.options[correctAns]}</span>
                          </div>
                        )}
                      </div>

                      {/* Explanation */}
                      <div className="p-3 bg-slate-900/40 rounded-lg text-xs text-slate-400 border-l-2 border-red-500/60 leading-relaxed">
                        <span className="font-semibold text-slate-300 block mb-1">
                          Fundamentação Técnica GTO:
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={restartProcess}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl px-6 py-3.5 flex items-center justify-center gap-2 cursor-pointer border border-slate-800 transition-all shadow-md"
              >
                <RefreshCw size={16} /> Realizar Nova Inscrição
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
