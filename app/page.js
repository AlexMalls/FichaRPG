'use client'

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase'; // Certifique-se de que este arquivo existe!

// ============ TEMA CENTRALIZADO ============
const theme = {
  colors: {
    bg: 'linear-gradient(135deg, #0f0a1a 0%, #1a0f2e 100%)',
    text: '#E8D5F0',
    accent: 'linear-gradient(135deg, #E8D5F0 0%, #6B5B95 100%)',
    border: 'rgba(232, 213, 240, 0.3)',
    borderLight: 'rgba(232, 213, 240, 0.1)',
    bgDark: 'rgba(232, 213, 240, 0.05)',
    success: '#4ade80',
    danger: '#f87171',
    warning: '#fbbf24',
  }
};

// ============ COMPONENTES REUTILIZÁVEIS ============

const FormBox = ({ children }) => (
  <div style={styles.formBox}>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={styles.inputGroup}>
    {label && <label style={styles.label}>{label}</label>}
    <input style={styles.input} {...props} />
  </div>
);

const Select = ({ label, options, value, onChange, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (opt) => {
    onChange?.(opt);
    setIsOpen(false);
  };

  return (
    <div style={styles.inputGroup}>
      {label && <label style={styles.label}>{label}</label>}
      <div style={styles.customSelectWrapper}>
        <button
          type="button"
          style={{
            ...styles.customSelectButton,
            borderColor: isOpen ? theme.colors.text : theme.colors.border,
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span style={styles.customSelectText}>
            {value || 'Selecione um modelo'}
          </span>
          <span style={{
            ...styles.customSelectIcon,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}>
            ↓
          </span>
        </button>

        {isOpen && (
          <div style={styles.customSelectDropdown}>
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(opt)}
                style={{
                  ...styles.customSelectOption,
                  background: value === opt ? 'rgba(232, 213, 240, 0.15)' : 'transparent',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ButtonPrimary = ({ children, ...props }) => (
  <button style={styles.buttonPrimary} {...props}>{children}</button>
);

const ButtonSecondary = ({ children, ...props }) => (
  <button style={styles.buttonSecondary} {...props}>{children}</button>
);

const ButtonDanger = ({ children, ...props }) => (
  <button style={styles.buttonDanger} {...props}>{children}</button>
);

// Componente de Loading
const LoadingSpinner = () => (
  <div style={styles.spinner}>
    <div style={styles.spinnerDot}></div>
    <span style={{ marginLeft: '1rem' }}>Carregando fichas...</span>
  </div>
);

// Toast de notificação
const Toast = ({ message, type = 'success' }) => (
  <div style={{
    ...styles.toast,
    borderLeft: `4px solid ${type === 'success' ? theme.colors.success : theme.colors.danger}`
  }}>
    {message}
  </div>
);

// ============ COMPONENTE PRINCIPAL ============
const EnnoisSite = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentPage, setCurrentPage] = useState('fichas');
  const [fichas, setFichas] = useState([]);
  const [showNewFichaForm, setShowNewFichaForm] = useState(false);
  const [selectedModelo, setSelectedModelo] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ============ CARREGAR FICHAS DO FIRESTORE ============
  useEffect(() => {
    const carregarFichas = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'fichas'), orderBy('dataCriacao', 'desc'));
        
        // Listener em tempo real
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fichasData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setFichas(fichasData);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Erro ao carregar fichas:', error);
        setLoading(false);
        mostrarToast('Erro ao carregar fichas', 'error');
      }
    };

    carregarFichas();
  }, []);

  // ============ HIDE WELCOME SCREEN ============
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ============ MOSTRAR TOAST ============
  const mostrarToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============ CRIAR NOVA FICHA ============
  const handleNewFicha = async (e) => {
    e.preventDefault();
    const nomeFicha = e.target.nome.value;
    
    if (!selectedModelo) {
      mostrarToast('Selecione um modelo de ficha', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // Salvar no Firestore
      await addDoc(collection(db, 'fichas'), {
        nome: nomeFicha,
        modelo: selectedModelo,
        dataCriacao: new Date(),
        ultimaEdicao: new Date(),
      });

      mostrarToast(`Ficha "${nomeFicha}" criada com sucesso!`, 'success');
      setShowNewFichaForm(false);
      setSelectedModelo('');
      e.target.reset();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao criar ficha:', error);
      mostrarToast('Erro ao criar ficha', 'error');
      setLoading(false);
    }
  };

  // ============ DELETAR FICHA ============
  const handleDeleteFicha = async (fichaId, fichaNome) => {
    if (window.confirm(`Tem certeza que quer deletar "${fichaNome}"?`)) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, 'fichas', fichaId));
        mostrarToast(`Ficha "${fichaNome}" deletada`, 'success');
        setLoading(false);
      } catch (error) {
        console.error('Erro ao deletar ficha:', error);
        mostrarToast('Erro ao deletar ficha', 'error');
        setLoading(false);
      }
    }
  };

  // ============ FORMATAR DATA ============
  const formatarData = (data) => {
    if (!data) return '';
    const date = data.toDate ? data.toDate() : new Date(data);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.container}>
      {/* Toast de notificação */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Tela de Boas-vindas */}
      <div style={{
        ...styles.welcome,
        opacity: showWelcome ? 1 : 0,
        pointerEvents: showWelcome ? 'auto' : 'none',
        transition: 'opacity 1s ease-out'
      }}>
        <div style={styles.welcomeLogo}>
          <div style={styles.welcomeText}>🐉 Ennoia</div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {!showWelcome && (
        <>
          {/* Menu */}
          <nav style={styles.nav}>
            <button 
              style={{
                ...styles.navButton,
                borderBottom: currentPage === 'fichas' ? `2px solid ${theme.colors.text}` : 'none'
              }}
              onClick={() => setCurrentPage('fichas')}
            >
              Suas Fichas
            </button>
            <button 
              style={{
                ...styles.navButton,
                borderBottom: currentPage === 'opcoes' ? `2px solid ${theme.colors.text}` : 'none'
              }}
              onClick={() => setCurrentPage('opcoes')}
            >
              Opções
            </button>
            <button 
              style={{
                ...styles.navButton,
                borderBottom: currentPage === 'creditos' ? `2px solid ${theme.colors.text}` : 'none'
              }}
              onClick={() => setCurrentPage('creditos')}
            >
              Créditos
            </button>
          </nav>

          {/* Conteúdo */}
          <main style={styles.content}>
            {currentPage === 'fichas' && (
              <div style={styles.page}>
                {loading && <LoadingSpinner />}

                {!loading && fichas.length === 0 && !showNewFichaForm ? (
                  <div style={styles.empty}>
                    <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Você ainda não tem fichas</p>
                    <ButtonPrimary onClick={() => setShowNewFichaForm(true)}>
                      + Nova Ficha
                    </ButtonPrimary>
                  </div>
                ) : (
                  <>
                    {!loading && fichas.length > 0 && (
                      <div style={styles.fichasList}>
                        {fichas.map(ficha => (
                          <div key={ficha.id} style={styles.fichaItem}>
                            <div style={styles.fichaContent}>
                              <div style={{fontWeight: '600', fontSize: '1.1rem'}}>
                                {ficha.nome}
                              </div>
                              <div style={{fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem'}}>
                                Modelo: {ficha.modelo}
                              </div>
                              <div style={{fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem'}}>
                                Criada em: {formatarData(ficha.dataCriacao)}
                              </div>
                            </div>
                            <div style={styles.fichaActions}>
                              <button 
                                style={styles.editButton}
                                title="Editar ficha"
                              >
                                ✏️
                              </button>
                              <ButtonDanger
                                onClick={() => handleDeleteFicha(ficha.id, ficha.nome)}
                                title="Deletar ficha"
                              >
                                🗑️
                              </ButtonDanger>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!showNewFichaForm && (
                      <ButtonPrimary onClick={() => setShowNewFichaForm(true)}>
                        + Nova Ficha
                      </ButtonPrimary>
                    )}
                  </>
                )}
                
                {showNewFichaForm && (
                  <FormBox>
                    <form onSubmit={handleNewFicha} style={styles.form}>
                      <Input
                        type="text"
                        name="nome"
                        label="Nome do Personagem:"
                        placeholder="Digite o nome"
                        required
                        autoFocus
                      />
                      <Select
                        name="modelo"
                        label="Modelo de Ficha:"
                        options={['D&D 5e', 'Pathfinder', 'Sistema Geral']}
                        value={selectedModelo}
                        onChange={setSelectedModelo}
                      />
                      <div style={styles.formButtons}>
                        <ButtonPrimary type="submit">Criar</ButtonPrimary>
                        <ButtonSecondary 
                          type="button"
                          onClick={() => {
                            setShowNewFichaForm(false);
                            setSelectedModelo('');
                          }}
                        >
                          Cancelar
                        </ButtonSecondary>
                      </div>
                    </form>
                  </FormBox>
                )}
              </div>
            )}

            {currentPage === 'opcoes' && (
              <div style={styles.page}>
                <p style={styles.text}>Opções em breve...</p>
              </div>
            )}

            {currentPage === 'creditos' && (
              <div style={styles.page}>
                <div style={styles.creditsContainer}>
                  <p style={styles.creditsText}>🐉 Ennoia</p>
                  <p style={styles.creditsSubtext}>Site desenvolvido com Firebase Firestore</p>
                  <p style={{fontSize: '0.9rem', marginTop: '2rem', opacity: 0.6}}>
                    Versão 1.0 com sincronização em tempo real
                  </p>
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
};

// ============ ESTILOS ============
const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    background: theme.colors.bg,
    color: theme.colors.text,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    margin: 0,
    padding: 0,
    overflow: 'hidden',
  },
  welcome: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.bg,
    zIndex: 1000,
  },
  welcomeLogo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: '3rem',
    fontWeight: 'bold',
    background: theme.colors.accent,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '3rem',
    padding: '2rem 1rem',
    borderBottom: `1px solid ${theme.colors.borderLight}`,
  },
  navButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.text,
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.5rem 0',
    transition: 'all 0.3s ease',
    fontWeight: '500',
  },
  content: {
    height: 'calc(100vh - 120px)',
    overflow: 'auto',
    padding: '2rem',
  },
  page: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
  },

  // ============ COMPONENTES REUTILIZÁVEIS ============
  formBox: {
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.75rem',
    padding: '2rem',
    backdropFilter: 'blur(10px)',
    marginTop: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '500',
    color: theme.colors.text,
  },
  input: {
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.5rem',
    color: theme.colors.text,
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  customSelectWrapper: {
    position: 'relative',
  },
  customSelectButton: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.5)',
    border: `2px solid ${theme.colors.border}`,
    borderRadius: '0.5rem',
    color: theme.colors.text,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    outline: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: `0 0 12px rgba(232, 213, 240, 0.08)`,
    fontWeight: '500',
  },
  customSelectText: {
    flex: 1,
    textAlign: 'left',
  },
  customSelectIcon: {
    fontSize: '0.8rem',
    marginLeft: '0.5rem',
  },
  customSelectDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '0.5rem',
    background: 'rgba(15, 10, 26, 0.95)',
    border: `2px solid ${theme.colors.border}`,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    boxShadow: `0 8px 24px rgba(0, 0, 0, 0.4)`,
    zIndex: 10,
    backdropFilter: 'blur(10px)',
  },
  customSelectOption: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'transparent',
    color: theme.colors.text,
    fontSize: '1rem',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    borderBottom: `1px solid ${theme.colors.borderLight}`,
  },
  buttonPrimary: {
    background: theme.colors.accent,
    border: 'none',
    color: '#0f0a1a',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'transform 0.2s ease, opacity 0.2s ease',
  },
  buttonSecondary: {
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  buttonDanger: {
    background: 'rgba(248, 113, 113, 0.1)',
    border: `1px solid ${theme.colors.danger}`,
    color: theme.colors.danger,
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  formButtons: {
    display: 'flex',
    gap: '1rem',
  },
  fichasList: {
    marginBottom: '2rem',
  },
  fichaItem: {
    padding: '1.5rem',
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.3s ease',
  },
  fichaContent: {
    flex: 1,
  },
  fichaActions: {
    display: 'flex',
    gap: '0.5rem',
    marginLeft: '1rem',
  },
  editButton: {
    background: 'rgba(250, 204, 21, 0.1)',
    border: `1px solid rgba(250, 204, 21, 0.3)`,
    color: theme.colors.text,
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  text: {
    fontSize: '1.1rem',
    textAlign: 'center',
    marginTop: '2rem',
  },
  creditsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '3rem',
    padding: '2rem',
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.75rem',
  },
  creditsText: {
    fontSize: '1.5rem',
    fontWeight: '600',
  },
  creditsSubtext: {
    fontSize: '1rem',
    opacity: 0.8,
  },
  spinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: theme.colors.text,
  },
  spinnerDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: theme.colors.text,
    animation: 'pulse 1.5s infinite',
  },
  toast: {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.5rem',
    padding: '1rem 1.5rem',
    color: theme.colors.text,
    zIndex: 2000,
    animation: 'slideIn 0.3s ease',
  }
};

// Adicionar keyframes para animações
const globalStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Injetar estilos globais
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}

export default EnnoisSite;
