'use client'

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  onSnapshot,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';

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

const LoadingSpinner = () => (
  <div style={styles.spinner}>
    <div style={styles.spinnerDot}></div>
    <span style={{ marginLeft: '1rem' }}>Carregando fichas...</span>
  </div>
);

const Toast = ({ message, type = 'success' }) => (
  <div style={{
    ...styles.toast,
    borderLeft: `4px solid ${type === 'success' ? theme.colors.success : theme.colors.danger}`
  }}>
    {message}
  </div>
);

// ============ CARD EXPANDÍVEL ============
const ExpandableCard = ({ title, children, expanded, onToggle }) => (
  <div style={{
    ...styles.card,
    maxHeight: expanded ? '500px' : '60px',
    transition: 'max-height 0.3s ease, box-shadow 0.3s ease',
    boxShadow: expanded ? `0 8px 24px rgba(232, 213, 240, 0.1)` : `0 4px 12px rgba(0, 0, 0, 0.2)`
  }}>
    {/* Header do Card */}
    <div style={styles.cardHeader}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <button
        onClick={onToggle}
        style={{
          ...styles.moreDetailsButton,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}
        title={expanded ? 'Menos detalhes' : 'Mais detalhes'}
      >
        ▼
      </button>
    </div>

    {/* Conteúdo do Card (expandível) */}
    {expanded && (
      <div style={styles.cardContent}>
        {children}
      </div>
    )}
  </div>
);

// ============ PÁGINA DE VISUALIZAÇÃO DA FICHA ============
const FichaDetailView = ({ ficha, onBack, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    nome: ficha.nome || '',
    classe: ficha.classe || '',
    nivel: ficha.nivel || '',
    raca: ficha.raca || '',
    antecedente: ficha.antecedente || '',
    alinhamento: ficha.alinhamento || '',
    xp: ficha.xp || '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'fichas', ficha.id), formData);
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  return (
    <div style={styles.detailContainer}>
      {/* Header com botão voltar */}
      <div style={styles.detailHeader}>
        <button 
          onClick={onBack}
          style={styles.backButton}
          title="Voltar"
        >
          ← Voltar
        </button>
        <h1 style={styles.detailTitle}>{ficha.nome}</h1>
        <div style={{ width: '80px' }}></div>
      </div>

      <div style={styles.detailContent}>
        {/* Menu Lateral */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarContent}>
            <ExpandableCard
              title="INFORMAÇÕES BÁSICAS"
              expanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
            >
              <div style={styles.cardFields}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Nome:</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    style={styles.fieldInput}
                    placeholder="Nome do personagem"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Classe:</label>
                  <input
                    type="text"
                    value={formData.classe}
                    onChange={(e) => handleInputChange('classe', e.target.value)}
                    style={styles.fieldInput}
                    placeholder="Ex: Guerreiro"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Nível:</label>
                  <input
                    type="number"
                    value={formData.nivel}
                    onChange={(e) => handleInputChange('nivel', e.target.value)}
                    style={styles.fieldInput}
                    placeholder="1"
                    min="1"
                    max="20"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Raça:</label>
                  <input
                    type="text"
                    value={formData.raca}
                    onChange={(e) => handleInputChange('raca', e.target.value)}
                    style={styles.fieldInput}
                    placeholder="Ex: Humano"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Antecedente:</label>
                  <input
                    type="text"
                    value={formData.antecedente}
                    onChange={(e) => handleInputChange('antecedente', e.target.value)}
                    style={styles.fieldInput}
                    placeholder="Ex: Soldado"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Alinhamento:</label>
                  <input
                    type="text"
                    value={formData.alinhamento}
                    onChange={(e) => handleInputChange('alinhamento', e.target.value)}
                    style={styles.fieldInput}
                    placeholder="Ex: Neutro Bom"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Pontos de Experiência:</label>
                  <input
                    type="number"
                    value={formData.xp}
                    onChange={(e) => handleInputChange('xp', e.target.value)}
                    style={styles.fieldInput}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <button
                  onClick={handleSave}
                  style={styles.saveButton}
                >
                  💾 Salvar
                </button>
              </div>
            </ExpandableCard>
          </div>
        </aside>

        {/* Área principal (vazio por enquanto) */}
        <main style={styles.mainArea}>
          <div style={styles.emptyState}>
            <p style={{ opacity: 0.6 }}>Selecione um card no menu lateral</p>
          </div>
        </main>
      </div>
    </div>
  );
};

// ============ COMPONENTE PRINCIPAL ============
const EnnoisSite = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentPage, setCurrentPage] = useState('fichas');
  const [fichas, setFichas] = useState([]);
  const [showNewFichaForm, setShowNewFichaForm] = useState(false);
  const [selectedModelo, setSelectedModelo] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedFicha, setSelectedFicha] = useState(null);

  // ============ CARREGAR FICHAS DO FIRESTORE ============
  useEffect(() => {
    const carregarFichas = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'fichas'), orderBy('dataCriacao', 'desc'));
        
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const mostrarToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleNewFicha = async (e) => {
    e.preventDefault();
    const nomeFicha = e.target.nome.value;
    
    if (!selectedModelo) {
      mostrarToast('Selecione um modelo de ficha', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      await addDoc(collection(db, 'fichas'), {
        nome: nomeFicha,
        modelo: selectedModelo,
        dataCriacao: new Date(),
        ultimaEdicao: new Date(),
        classe: '',
        nivel: '',
        raca: '',
        antecedente: '',
        alinhamento: '',
        xp: '',
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

  // Se está visualizando uma ficha, mostra a página de detalhes
  if (selectedFicha) {
    return (
      <div style={styles.container}>
        {toast && <Toast message={toast.message} type={toast.type} />}
        <FichaDetailView 
          ficha={selectedFicha} 
          onBack={() => setSelectedFicha(null)}
          onUpdate={() => {
            mostrarToast('Ficha atualizada com sucesso!', 'success');
          }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {toast && <Toast message={toast.message} type={toast.type} />}

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

      {!showWelcome && (
        <>
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
                          <div 
                            key={ficha.id} 
                            style={styles.fichaItem}
                            onClick={() => setSelectedFicha(ficha)}
                          >
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
                              <ButtonDanger
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFicha(ficha.id, ficha.nome);
                                }}
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
                    Versão 2.0 com visualização de fichas
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

  // ============ FORMULÁRIOS ============
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
    cursor: 'pointer',
  },
  fichaContent: {
    flex: 1,
  },
  fichaActions: {
    display: 'flex',
    gap: '0.5rem',
    marginLeft: '1rem',
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
  },

  // ============ PÁGINA DE DETALHES ============
  detailContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: theme.colors.bg,
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2rem',
    borderBottom: `1px solid ${theme.colors.borderLight}`,
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.text,
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    transition: 'all 0.3s ease',
    fontWeight: '500',
  },
  detailTitle: {
    fontSize: '1.8rem',
    fontWeight: '600',
    margin: 0,
  },
  detailContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '350px',
    borderRight: `1px solid ${theme.colors.borderLight}`,
    overflow: 'auto',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  sidebarContent: {
    padding: '1.5rem',
  },
  mainArea: {
    flex: 1,
    overflow: 'auto',
    padding: '2rem',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    color: theme.colors.text,
  },

  // ============ CARD EXPANSÍVEL ============
  card: {
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    cursor: 'pointer',
    userSelect: 'none',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: theme.colors.text,
  },
  moreDetailsButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.text,
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    transition: 'transform 0.3s ease',
    opacity: 0.7,
  },
  cardContent: {
    padding: '0 1.5rem 1.5rem 1.5rem',
    animation: 'expandContent 0.3s ease',
  },
  cardFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  fieldLabel: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: theme.colors.text,
    opacity: 0.9,
  },
  fieldInput: {
    padding: '0.6rem 0.8rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.4rem',
    color: theme.colors.text,
    fontSize: '0.9rem',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  saveButton: {
    marginTop: '1rem',
    background: theme.colors.accent,
    border: 'none',
    color: '#0f0a1a',
    padding: '0.6rem 1rem',
    fontSize: '0.9rem',
    borderRadius: '0.4rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
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

  @keyframes expandContent {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}

export default EnnoisSite;
