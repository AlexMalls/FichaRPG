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

// ============================================================
// ⚙️  CONFIGURAÇÃO DO GRID — mexa aqui à vontade
// ============================================================
const GRID_CONFIG = {
  colunas:       6,    // número de colunas
  linhas:        11,   // número de linhas
  alturaCell:    80,   // altura de cada célula em px
  gap:           8,    // espaçamento entre células em px
  paddingGrid:   16,   // padding interno do grid em px
};
// ── aliases internos (não mexa) ──────────────────────────────
const GRID_COLS    = GRID_CONFIG.colunas;
const GRID_ROWS    = GRID_CONFIG.linhas;
const CELL_H       = GRID_CONFIG.alturaCell;
const GAP          = GRID_CONFIG.gap;
const GRID_PADDING = GRID_CONFIG.paddingGrid;
// ============================================================

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
    <div style={styles.cardHeader}>
      <h3 style={styles.cardTitle}>{title}</h3>
    </div>

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

const FichaDetailView = ({ ficha, onBack, onUpdate }) => {
  const [cardMovelPos, setCardMovelPos]     = useState(null);
  const [cardSize, setCardSize]             = useState({ cols: 1, rows: 1 });
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [dragOffset, setDragOffset]         = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos]             = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing]         = useState(false);
  const [resizePreview, setResizePreview]   = useState(null);
  const [ghostSize, setGhostSize]           = useState({ w: 180, h: 100 });
  const [hoverCell, setHoverCell]           = useState(null);
  const [cellWidth, setCellWidth]           = useState(0);

  // Campos editáveis da ficha — inicializados com os dados vindos do Firestore
  const [fichaData, setFichaData] = useState({
    nome:         ficha?.nome         || '',
    classe:       ficha?.classe       || '',
    nivel:        ficha?.nivel        || '',
    raca:         ficha?.raca         || '',
    antecedente:  ficha?.antecedente  || '',
    alinhamento:  ficha?.alinhamento  || '',
    xp:           ficha?.xp           || '',
  });

  const handleFieldChange = (campo, valor) => {
    setFichaData(prev => ({ ...prev, [campo]: valor }));
  };

  const isDraggingRef  = React.useRef(false);
  const isResizingRef  = React.useRef(false);
  const gridRef        = React.useRef(null);
  const resizeOrigin   = React.useRef({ col: 1, row: 1 });
  // Refs para ter os valores de offset/size atuais dentro dos closures do useEffect
  const dragOffsetRef  = React.useRef({ x: 0, y: 0 });
  const ghostSizeRef   = React.useRef({ w: 180, h: 100 });
  const cardSizeRef    = React.useRef({ cols: 1, rows: 1 });

  const espacos = [];
  let id = 1;
  for (let row = 1; row <= GRID_ROWS; row++) {
    for (let col = 1; col <= GRID_COLS; col++) {
      espacos.push({ id: id++, col, row });
    }
  }

  const getCellFromPoint = (x, y) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const relX = x - rect.left - GRID_PADDING;
    const relY = y - rect.top  - GRID_PADDING;
    if (relX < 0 || relY < 0) return null;
    const availableWidth = rect.width - GRID_PADDING * 2;
    const cellW = (availableWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;
    const col = Math.floor(relX / (cellW + GAP)) + 1;
    const row = Math.floor(relY / (CELL_H + GAP)) + 1;
    if (col < 1 || col > GRID_COLS || row < 1 || row > GRID_ROWS) return null;
    return { col, row };
  };

  // Calcula a célula de origem (canto sup-esq) baseado no canto sup-esq do fantasma,
  // que é o mouse menos o dragOffset. Clampeia para que o card caiba no grid.
  const getOriginCellFromGhost = (mouseX, mouseY) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const offset = dragOffsetRef.current;
    const size   = cardSizeRef.current;

    // Canto superior esquerdo do ghost no espaço da página
    const ghostLeft = mouseX - offset.x;
    const ghostTop  = mouseY - offset.y;

    // Converte para coordenadas relativas ao grid (descontando padding)
    const relX = ghostLeft - rect.left - GRID_PADDING;
    const relY = ghostTop  - rect.top  - GRID_PADDING;

    const availableWidth = rect.width - GRID_PADDING * 2;
    const cellW = (availableWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;

    let col = Math.round(relX / (cellW + GAP)) + 1;
    let row = Math.round(relY / (CELL_H + GAP)) + 1;

    // Clampeia para que o card inteiro caiba dentro do grid
    col = Math.max(1, Math.min(col, GRID_COLS - size.cols + 1));
    row = Math.max(1, Math.min(row, GRID_ROWS - size.rows + 1));

    return { col, row };
  };

  // Função para calcular a largura de uma célula
  const calculateCellWidth = () => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const availableWidth = rect.width - GRID_PADDING * 2;
    const cellW = (availableWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;
    return cellW;
  };

  // ResizeObserver para medir a largura real da célula
  useEffect(() => {
    if (!gridRef.current) return;

    const observer = new ResizeObserver(() => {
      const cellW = calculateCellWidth();
      setCellWidth(cellW);
    });

    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDraggingRef.current) {
        setMousePos({ x: e.clientX, y: e.clientY });
        const cell = getOriginCellFromGhost(e.clientX, e.clientY);
        setHoverCell(cell);
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
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.classList.remove('is-resizing');
        if (resizePreview) {
          setCardSize(resizePreview);
          cardSizeRef.current = { ...resizePreview };
        }
        setResizePreview(null);
        return;
      }
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingCard(false);
        setMousePos({ x: 0, y: 0 });
        setDragOffset({ x: 0, y: 0 });
        setHoverCell(null);
        document.body.classList.remove('is-dragging');
        const cell = getOriginCellFromGhost(e.clientX, e.clientY);
        if (cell) setCardMovelPos(cell);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizePreview]);

  // FIX: cálculo correto do tamanho do ghost + sync de refs para closures
  const handleCardMouseDown = (e) => {
    e.preventDefault();
    if (gridRef.current) {
      const gridRect = gridRef.current.getBoundingClientRect();
      const availableWidth = gridRect.width - GRID_PADDING * 2;
      const cellW = (availableWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;
      const ghostW = cellW * cardSize.cols + GAP * (cardSize.cols - 1);
      const ghostH = CELL_H * cardSize.rows + GAP * (cardSize.rows - 1);
      const offset = { x: ghostW / 2, y: ghostH / 2 };
      setDragOffset(offset);
      setGhostSize({ w: ghostW, h: ghostH });
      // Sincroniza refs para os closures do useEffect terem os valores atuais
      dragOffsetRef.current = offset;
      ghostSizeRef.current  = { w: ghostW, h: ghostH };
    } else {
      const offset = { x: 90, y: 20 };
      setDragOffset(offset);
      setGhostSize({ w: 180, h: 100 });
      dragOffsetRef.current = offset;
      ghostSizeRef.current  = { w: 180, h: 100 };
    }
    cardSizeRef.current = { ...cardSize };
    setMousePos({ x: e.clientX, y: e.clientY });
    setIsDraggingCard(true);
    isDraggingRef.current = true;
    document.body.classList.add('is-dragging');
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardMovelPos) return;
    resizeOrigin.current = { col: cardMovelPos.col, row: cardMovelPos.row };
    setResizePreview({ ...cardSize });
    setIsResizing(true);
    isResizingRef.current = true;
    document.body.classList.add('is-resizing');
  };

  const activeSize = isResizing && resizePreview ? resizePreview : cardSize;

  const cardOccupies = (col, row) => {
    if (!cardMovelPos) return false;
    return (
      col >= cardMovelPos.col &&
      col < cardMovelPos.col + activeSize.cols &&
      row >= cardMovelPos.row &&
      row < cardMovelPos.row + activeSize.rows
    );
  };

  // FIX 2: checa se a célula está na área de preview de drop
  const isDropPreview = (col, row) => {
    if (!isDraggingCard || !hoverCell) return false;
    return (
      col >= hoverCell.col &&
      col < hoverCell.col + cardSize.cols &&
      row >= hoverCell.row &&
      row < hoverCell.row + cardSize.rows
    );
  };

  // Calcula o tamanho total do card móvel em pixels
  const calculateCardPixelSize = () => {
    const cellW = calculateCellWidth();
    if (cellW <= 0) return { w: 100, h: 100 };
    
    const cardWidthPx = cellW * cardSize.cols + GAP * Math.max(0, cardSize.cols - 1);
    const cardHeightPx = CELL_H * cardSize.rows + GAP * Math.max(0, cardSize.rows - 1);
    
    return { w: cardWidthPx, h: cardHeightPx };
  };

  const cardPixelSize = calculateCardPixelSize();

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

            {/* Card no sidebar — só aparece se ainda não foi colocado no grid */}
            {!cardMovelPos && (
            <div
              onMouseDown={handleCardMouseDown}
              style={{
                ...styles.cardMovel,
                marginTop: '1rem',
                cursor: isDraggingCard ? 'grabbing' : 'grab',
                opacity: isDraggingCard ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
                width: cellWidth > 0 ? `${cellWidth}px` : 'auto',
                minWidth: cellWidth > 0 ? `${cellWidth}px` : 'auto',
              }}
            >
              <div style={styles.cardMovelHeader}>
                <h4 style={styles.cardMovelTitle}>INFORMAÇÕES BÁSICAS</h4>
              </div>
            </div>
            )}
          </div>
        </aside>

        {/* ── Área principal ── */}
        <main style={styles.mainArea}>
          <div ref={gridRef} style={styles.gridContainer}>

            {/* Placeholders */}
            {espacos.map((espaco) => {
              const ocupado = cardOccupies(espaco.col, espaco.row);
              const preview = isDropPreview(espaco.col, espaco.row);

              return (
                <div
                  key={espaco.id}
                  data-grid-cell
                  data-col={espaco.col}
                  data-row={espaco.row}
                  style={{
                    ...styles.spaceCard,
                    gridColumn: espaco.col,
                    gridRow: espaco.row,
                    // FIX 2: estilos de highlight amarelo no preview, senão comportamento original
                    ...(ocupado
                      ? { opacity: 0 }
                      : preview
                      ? {
                          opacity: 1,
                          border: '2px solid rgba(251, 191, 36, 0.85)',
                          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.18) 100%)',
                          boxShadow: '0 0 16px rgba(251, 191, 36, 0.35)',
                          transition: 'all 0.1s ease',
                        }
                      : { opacity: 0.5 }
                    ),
                  }}
                >
                  <div style={styles.spaceCardContent}>
                    C:{espaco.col} L:{espaco.row}
                  </div>
                </div>
              );
            })}

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
                  overflow: 'hidden',
                  zIndex: 2,
                  flexDirection: 'column',
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                }}
              >
                <div style={styles.cardMovelHeader}>
                  <h4 style={styles.cardMovelTitle}>INFORMAÇÕES BÁSICAS</h4>
                </div>

                {/* Campos editáveis — tamanho proporcional ao card em grid */}
                <div
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    ...styles.cardFieldsGrid,
                    flex: 1,
                    overflow: 'auto',
                  }}
                >
                  {[
                    { campo: 'nome',        label: 'Nome'        },
                    { campo: 'classe',      label: 'Classe'      },
                    { campo: 'nivel',       label: 'Nível'       },
                    { campo: 'raca',        label: 'Raça'        },
                    { campo: 'antecedente', label: 'Antecedente' },
                    { campo: 'alinhamento', label: 'Alinhamento' },
                    { campo: 'xp',          label: 'XP'          },
                  ].map(({ campo, label }) => (
                    <div key={campo} style={styles.cardFieldBox}>
                      <span style={styles.cardFieldLabel}>{label}</span>
                      <input
                        className="card-field-input"
                        style={styles.cardFieldInput}
                        value={fichaData[campo]}
                        onChange={e => handleFieldChange(campo, e.target.value)}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>

                {/* Botão X — remove o card do grid e devolve ao sidebar */}
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setCardMovelPos(null)}
                  title="Remover do grid"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(248, 113, 113, 0.25)',
                    color: '#f87171',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    opacity: 0.7,
                    transition: 'opacity 0.2s, background 0.2s',
                    zIndex: 10,
                    padding: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(248, 113, 113, 0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.background = 'rgba(248, 113, 113, 0.25)'; }}
                >
                  ✕
                </button>

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
                opacity: 0.8,
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
          <img
            src="/images/logo.png"
            alt="Ennoia"
            style={{ width: '120px', height: '120px', objectFit: 'contain' }}
          />
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
                  <img
                    src="/images/logo.png"
                    alt="Ennoia"
                    style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                  />
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

  // ============ GRID DE ESPAÇOS ============
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_H}px)`,
    gap: `${GAP}px`,
    width: '100%',
    padding: `${GRID_PADDING}px`,
    position: 'relative',
  },
  spaceCard: {
    height: `${CELL_H}px`,
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
    flexShrink: 0,
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

  // ── Campos editáveis dentro do card ──
  cardFieldsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    padding: '6px 4px 4px 4px',
    alignContent: 'start',
    boxSizing: 'border-box',
    width: '100%',
  },
  cardFieldBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardFieldLabel: {
    fontSize: '0.6rem',
    fontWeight: '700',
    color: 'rgba(232, 213, 240, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    paddingLeft: '4px',
  },
  cardFieldInput: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(232, 213, 240, 0.15)',
    borderRadius: '4px',
    color: '#E8D5F0',
    fontSize: '0.72rem',
    padding: '3px 6px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
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

  .card-field-input:focus {
    border-color: rgba(232, 213, 240, 0.5) !important;
    background: rgba(0, 0, 0, 0.5) !important;
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}

export default EnnoisSite;

