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
const ExpandableCard = ({ title, fields, expanded, onToggle }) => (
  <div style={{
    ...styles.card,
    maxHeight: expanded ? '300px' : '80px',
    transition: 'max-height 0.3s ease, box-shadow 0.3s ease',
    boxShadow: expanded ? `0 8px 24px rgba(232, 213, 240, 0.1)` : `0 4px 12px rgba(0, 0, 0, 0.2)`
  }}>
    {/* Header do Card */}
    <div style={styles.cardHeader}>
      <h3 style={styles.cardTitle}>{title}</h3>
    </div>

    {/* Footer com "Detalhes" e Seta */}
    <div style={styles.cardFooter}>
      <span style={styles.detalhesText}>Detalhes</span>
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
        <div style={styles.fieldsList}>
          {fields.map((field, idx) => (
            <div key={idx} style={styles.fieldListItem}>
              {field}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ============ PÁGINA DE VISUALIZAÇÃO DA FICHA ============
// Constantes do grid — devem bater com os estilos de gridContainer
const GRID_COLS = 6;
const GRID_ROWS = 7;
const CELL_H = 100;   // gridTemplateRows: repeat(7, 100px)
const GAP = 12.8;     // 0.8rem ≈ 12.8px

const FichaDetailView = ({ ficha, onBack, onUpdate }) => {
  const [cardMovelPos, setCardMovelPos]     = useState(null);          // { col, row }
  const [cardSize, setCardSize]             = useState({ cols: 1, rows: 1 }); // span
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [dragOffset, setDragOffset]         = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos]             = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing]         = useState(false);
  const [resizePreview, setResizePreview]   = useState(null); // { cols, rows } durante resize
  const [ghostSize, setGhostSize]           = useState({ w: 180, h: 100 });

  const isDraggingRef = React.useRef(false);
  const isResizingRef = React.useRef(false);
  const gridRef       = React.useRef(null);
  const resizeOrigin  = React.useRef({ col: 1, row: 1 }); // col/row onde o card começa

  // Espaços do grid
  const espacos = [];
  let id = 1;
  for (let row = 1; row <= GRID_ROWS; row++) {
    for (let col = 1; col <= GRID_COLS; col++) {
      espacos.push({ id: id++, col, row });
    }
  }

  // Dado um ponto (clientX, clientY), devolve { col, row } da célula do grid sob o cursor
  const getCellFromPoint = (x, y) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const relX = x - rect.left - 16; // 1rem padding do gridContainer
    const relY = y - rect.top  - 16;
    if (relX < 0 || relY < 0) return null;
    const cellW = (rect.width - 32) / GRID_COLS; // descontando padding dos dois lados
    const col = Math.floor(relX / cellW) + 1;
    const row = Math.floor(relY / (CELL_H + GAP)) + 1;
    if (col < 1 || col > GRID_COLS || row < 1 || row > GRID_ROWS) return null;
    return { col, row };
  };

  // ── Listeners globais de mouse ──────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDraggingRef.current) {
        setMousePos({ x: e.clientX, y: e.clientY });
      }
      if (isResizingRef.current) {
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (cell) {
          const origin = resizeOrigin.current;
          const cols = Math.max(1, Math.min(cell.col - origin.col + 1, GRID_COLS - origin.col + 1));
          const rows = Math.max(1, Math.min(cell.row - origin.row + 1, GRID_ROWS - origin.row + 1));
          setResizePreview({ cols, rows });
        }
      }
    };

    const onMouseUp = (e) => {
      // ── Soltou resize ──
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.classList.remove('is-resizing');
        if (resizePreview) setCardSize(resizePreview);
        setResizePreview(null);
        return;
      }
      // ── Soltou drag ──
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingCard(false);
        setMousePos({ x: 0, y: 0 });
        setDragOffset({ x: 0, y: 0 });
        document.body.classList.remove('is-dragging');
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (cell) setCardMovelPos(cell);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizePreview]); // resizePreview como dep para ter o valor atual no mouseup

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCardMouseDown = (e) => {
    e.preventDefault();
    // Calcula dimensões reais do card para centralizar o fantasma corretamente
    if (gridRef.current) {
      const gridRect = gridRef.current.getBoundingClientRect();
      const cellW = (gridRect.width - 32) / GRID_COLS;
      const ghostW = cellW * cardSize.cols + GAP * (cardSize.cols - 1);
      const ghostH = CELL_H * cardSize.rows + GAP * (cardSize.rows - 1);
      setDragOffset({ x: ghostW / 2, y: ghostH / 2 });
      setGhostSize({ w: ghostW, h: ghostH });
    } else {
      setDragOffset({ x: 90, y: 20 });
      setGhostSize({ w: 180, h: 100 });
    }
    setMousePos({ x: e.clientX, y: e.clientY });
    setIsDraggingCard(true);
    isDraggingRef.current = true;
    document.body.classList.add('is-dragging');
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation(); // não dispara drag
    if (!cardMovelPos) return;
    resizeOrigin.current = { col: cardMovelPos.col, row: cardMovelPos.row };
    setResizePreview({ ...cardSize });
    setIsResizing(true);
    isResizingRef.current = true;
    document.body.classList.add('is-resizing');
  };

  // Tamanho atual (ou preview enquanto redimensiona)
  const activeSize = isResizing && resizePreview ? resizePreview : cardSize;

  // Células que o card ocupa atualmente (para esconder os placeholders)
  const cardOccupies = (col, row) => {
    if (!cardMovelPos) return false;
    return (
      col >= cardMovelPos.col &&
      col < cardMovelPos.col + activeSize.cols &&
      row >= cardMovelPos.row &&
      row < cardMovelPos.row + activeSize.rows
    );
  };

  return (
    <div style={{ ...styles.detailContainer, userSelect: 'none' }}>
      <div style={styles.detailContent}>

        {/* ── Sidebar ── */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarContent}>
            <button onClick={onBack} style={styles.backButtonSidebar}>← Voltar</button>

            <div style={{ fontSize: '0.85rem', color: theme.colors.text, opacity: 0.6, marginTop: '1rem', padding: '1rem', borderTop: `1px solid ${theme.colors.borderLight}` }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>💡 Dica:</p>
              <p style={{ margin: 0 }}>Arraste para o grid e redimensione pelo canto ↘</p>
            </div>

            {/* Card no sidebar */}
            <div
              onMouseDown={handleCardMouseDown}
              style={{
                ...styles.cardMovel,
                marginTop: '1rem',
                cursor: isDraggingCard ? 'grabbing' : 'grab',
                opacity: isDraggingCard ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <div style={styles.cardMovelHeader}>
                <h4 style={styles.cardMovelTitle}>INFORMAÇÕES BÁSICAS</h4>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Área principal ── */}
        <main style={styles.mainArea}>
          <div ref={gridRef} style={styles.gridContainer}>

            {/* Placeholders */}
            {espacos.map((espaco) => (
              <div
                key={espaco.id}
                data-grid-cell
                data-col={espaco.col}
                data-row={espaco.row}
                style={{
                  ...styles.spaceCard,
                  gridColumn: espaco.col,
                  gridRow: espaco.row,
                  opacity: cardOccupies(espaco.col, espaco.row) ? 0 : 0.5,
                }}
              >
                <div style={styles.spaceCardContent}>
                  C:{espaco.col} L:{espaco.row}
                </div>
              </div>
            ))}

            {/* Card posicionado no grid */}
            {cardMovelPos && (
              <div
                onMouseDown={handleCardMouseDown}
                style={{
                  ...styles.cardMovel,
                  gridColumn: `${cardMovelPos.col} / span ${activeSize.cols}`,
                  gridRow:    `${cardMovelPos.row} / span ${activeSize.rows}`,
                  cursor: isDraggingCard ? 'grabbing' : 'grab',
                  opacity: isDraggingCard ? 0.6 : 1,
                  transition: 'opacity 0.15s ease, grid-column 0.1s ease, grid-row 0.1s ease',
                  overflow: 'visible',
                  zIndex: 2,
                }}
              >
                <div style={styles.cardMovelHeader}>
                  <h4 style={styles.cardMovelTitle}>INFORMAÇÕES BÁSICAS</h4>
                </div>

                {/* Handle de resize — canto inferior direito */}
                <div
                  onMouseDown={handleResizeMouseDown}
                  title="Redimensionar"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    cursor: 'nwse-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isResizing ? 1 : 0.5,
                    transition: 'opacity 0.2s',
                    zIndex: 10,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => { if (!isResizing) e.currentTarget.style.opacity = 0.5; }}
                >
                  {/* Ícone de resize — três linhas diagonais */}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <line x1="12" y1="4"  x2="4"  y2="12" stroke="#E8D5F0" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="12" y1="8"  x2="8"  y2="12" stroke="#E8D5F0" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="12" y1="12" x2="12" y2="12" stroke="#E8D5F0" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Card fantasma seguindo o mouse */}
          {isDraggingCard && (
            <div
              style={{
                ...styles.cardMovel,
                position: 'fixed',
                left: `${mousePos.x - dragOffset.x}px`,
                top:  `${mousePos.y - dragOffset.y}px`,
                width:  `${ghostSize.w}px`,
                height: `${ghostSize.h}px`,
                pointerEvents: 'none',
                zIndex: 9999,
                opacity: 0.6,
                cursor: 'grabbing',
                boxShadow: '0 12px 32px rgba(232, 213, 240, 0.35)',
                transition: 'none',
              }}
            >
              <div style={styles.cardMovelHeader}>
                <h4 style={styles.cardMovelTitle}>INFORMAÇÕES BÁSICAS</h4>
              </div>
            </div>
          )}
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
          selectedFicha={selectedFicha}
          setSelectedFicha={setSelectedFicha}
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
  detailContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '280px',
    borderRight: `1px solid ${theme.colors.borderLight}`,
    overflow: 'auto',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarContent: {
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  backButtonSidebar: {
    background: 'none',
    border: 'none',
    color: theme.colors.text,
    fontSize: '0.95rem',
    cursor: 'pointer',
    padding: '0.75rem 1rem',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    textAlign: 'left',
    borderRadius: '0.5rem',
    opacity: 0.8,
  },
  mainArea: {
    flex: 1,
    overflow: 'auto',
    padding: '2rem',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  emptyState: {
    textAlign: 'center',
    color: theme.colors.text,
    opacity: 0.6,
  },

  // ============ GRID DE ESPAÇOS ============
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gridTemplateRows: 'repeat(7, 100px)',
    gap: '0.8rem',
    width: '100%',
    padding: '1rem',
    position: 'relative',
  },
  spaceCard: {
    height: '100px',
    background: 'linear-gradient(135deg, rgba(232, 213, 240, 0.075) 0%, rgba(107, 91, 149, 0.075) 100%)',
    border: `2px solid rgba(232, 213, 240, 0.2)`,
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    opacity: 0.5,
  },
  spaceCardContent: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#E8D5F0',
    textAlign: 'center',
    pointerEvents: 'none',
  },

  // ============ CARD MÓVEL ============
  cardMovel: {
    background: 'linear-gradient(135deg, rgba(232, 213, 240, 0.25) 0%, rgba(107, 91, 149, 0.25) 100%)',
    border: `2px solid rgba(232, 213, 240, 0.6)`,
    borderRadius: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    padding: '0.75rem',
    cursor: 'grab',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(232, 213, 240, 0.15)',
    userSelect: 'none',
  },
  cardMovelHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottom: `1px solid rgba(232, 213, 240, 0.3)`,
  },
  cardMovelTitle: {
    margin: 0,
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#E8D5F0',
    textAlign: 'center',
    letterSpacing: '0.5px',
  },
  cardMovelContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    overflow: 'auto',
    maxHeight: '100%',
  },
  cardMovelField: {
    fontSize: '0.7rem',
    color: '#E8D5F0',
    opacity: 0.7,
    paddingLeft: '0.4rem',
    borderLeft: `1px solid rgba(232, 213, 240, 0.3)`,
    whiteSpace: 'nowrap',
  },

  // ============ CARD EXPANDÍVEL ============
  card: {
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    width: '100%',
    maxWidth: '250px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1.2rem 1rem',
    cursor: 'default',
    userSelect: 'none',
    minHeight: '50px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '0.5rem 1rem 0.8rem 1rem',
    borderTop: `1px solid ${theme.colors.borderLight}`,
  },
  cardTitle: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    flex: 1,
    letterSpacing: '0.5px',
  },
  moreDetailsButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.text,
    fontSize: '0.6rem',
    cursor: 'pointer',
    padding: '0.2rem 0.4rem',
    transition: 'transform 0.3s ease',
    opacity: 0.6,
    marginLeft: '0.4rem',
  },
  detalhesText: {
    fontSize: '0.75rem',
    color: theme.colors.text,
    opacity: 0.6,
    fontWeight: '500',
    letterSpacing: '0.5px',
  },
  cardContent: {
    padding: '1rem 1.2rem 1.2rem 1.2rem',
    animation: 'expandContent 0.3s ease',
  },
  fieldsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  fieldListItem: {
    fontSize: '0.85rem',
    color: theme.colors.text,
    opacity: 0.8,
    paddingLeft: '0.8rem',
    borderLeft: `2px solid ${theme.colors.border}`,
    fontWeight: '500',
  },
  cardFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
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

  body.is-dragging,
  body.is-dragging * {
    cursor: grabbing !important;
  }

  body.is-resizing,
  body.is-resizing * {
    cursor: nwse-resize !important;
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}

export default EnnoisSite;
