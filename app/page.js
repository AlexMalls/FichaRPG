'use client'

export const dynamic = 'force-static';

import React, { useState, useEffect, useCallback } from 'react';
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
  linhas:        44,   // número de linhas
  alturaCell:    40,   // altura de cada célula em px
  gap:           8,    // espaçamento entre células em px
  paddingGrid:   16,   // padding interno do grid em px
  opacidadeCelula: 0.00, // opacidade das células (0.0 a 1.0)
  mostrarTextoCelula: false, // true = mostra "C:1 L:1", false = esconde
};
// ── aliases internos (não mexa) ──────────────────────────────
const GRID_COLS    = GRID_CONFIG.colunas;
const GRID_ROWS    = GRID_CONFIG.linhas;
const CELL_H       = GRID_CONFIG.alturaCell;
const GAP          = GRID_CONFIG.gap;
const GRID_PADDING = GRID_CONFIG.paddingGrid;
// ============================================================

// ============================================================
// ⚙️  CONFIGURAÇÃO DO GRID INTERNO (dentro do CardMóvel)
// ============================================================
const GRID_INTERNO_CONFIG = {
  opacidadeCelula:    0.00,   // opacidade das células internas (0.0 a 1.0)
  mostrarTextoCelula: false,  // true = mostra "1:2", false = esconde
};
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

// ============ COMPONENTE DE INPUT PARA O GRID INTERNO ============
const GridInputField = ({ label, value, onChange, placeholder, onLabelMouseDown }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    gap: '2px',
  }}>
    <label 
      style={{
        ...styles.gridFieldLabel,
        cursor: 'grab',
        userSelect: 'none',
        padding: '1px 2px',
        borderRadius: '2px',
        transition: 'all 0.15s ease',
      }}
      onMouseDown={onLabelMouseDown}
      title="Arraste para reorganizar"
    >
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      style={styles.gridFieldInput}
    />
  </div>
);

// ============ PÁGINA DE VISUALIZAÇÃO DA FICHA ============

const FichaDetailView = ({ ficha, onBack, onUpdate }) => {
  const [cardMovelPos, setCardMovelPos]     = useState(ficha?.cardMovelPos || null);
  // Calcula o tamanho mínimo baseado nas posições e tamanhos dos campos
  const calcularTamanhoMinimo = () => {
    const positions = ficha?.fieldPositions || {
      nome: { col: 1, row: 1 }, classe: { col: 2, row: 1 }, nivel: { col: 3, row: 1 },
      alinhamento: { col: 1, row: 2 }, idade: { col: 2, row: 2 }, xp: { col: 3, row: 2 },
    };
    const sizes = ficha?.fieldSizes || {
      nome: { cols: 1, rows: 1 }, classe: { cols: 1, rows: 1 }, nivel: { cols: 1, rows: 1 },
      alinhamento: { cols: 1, rows: 1 }, idade: { cols: 1, rows: 1 }, xp: { cols: 1, rows: 1 },
    };
    let minCols = 1;
    let minRows = 1;
    for (const key in positions) {
      const p = positions[key];
      const s = sizes[key] || { cols: 1, rows: 1 };
      if (p.col + s.cols - 1 > minCols) minCols = p.col + s.cols - 1;
      if (p.row + s.rows - 1 > minRows) minRows = p.row + s.rows - 1;
    }
    return { cols: minCols, rows: minRows + 1 }; // +1 pelo cabeçalho
  };

  const [cardSize, setCardSize] = useState(() => {
    // Se o usuário já salvou um tamanho, usa ele. Senão, calcula o mínimo.
    if (ficha?.cardSize) return ficha.cardSize;
    return calcularTamanhoMinimo();
  });
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [dragOffset, setDragOffset]         = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos]             = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing]         = useState(false);
  const [resizePreview, setResizePreview]   = useState(null);
  const [ghostSize, setGhostSize]           = useState({ w: 180, h: 100 });
  const [hoverCell, setHoverCell]           = useState(null);
  const [ghostExpanded, setGhostExpanded]   = useState(false);

  // ── Estado dos campos do card móvel ──
  const [fichaData, setFichaData] = useState({
    nome: ficha?.nome || '',
    classe: ficha?.classe || '',
    nivel: ficha?.nivel || '',
    idade: ficha?.idade || '',
    alinhamento: ficha?.alinhamento || '',
    xp: ficha?.xp || '',
  });

  // ── Posições dos campos dentro do grid interno ──
  const [fieldPositions, setFieldPositions] = useState(ficha?.fieldPositions || {
    nome: { col: 1, row: 1 },
    classe: { col: 2, row: 1 },
    nivel: { col: 3, row: 1 },
    alinhamento: { col: 1, row: 2 },
    idade: { col: 2, row: 2 },
    xp: { col: 3, row: 2 },
  });

  // ── Tamanhos dos campos dentro do grid interno ──
  const [fieldSizes, setFieldSizes] = useState(ficha?.fieldSizes || {
    nome: { cols: 1, rows: 1 },
    classe: { cols: 1, rows: 1 },
    nivel: { cols: 1, rows: 1 },
    alinhamento: { cols: 1, rows: 1 },
    idade: { cols: 1, rows: 1 },
    xp: { cols: 1, rows: 1 },
  });

  const [cardOverdrag, setCardOverdrag] = useState({ right: false, bottom: false });

  // ── Estado de drag dos campos individuais ──
  const [draggingField, setDraggingField] = useState(null);
  const [fieldMousePos, setFieldMousePos] = useState({ x: 0, y: 0 });
  const [fieldHoverCell, setFieldHoverCell] = useState(null);
  
  // ── Estado de resize dos campos ──
  const [resizingField, setResizingField] = useState(null);
  const [fieldResizePreview, setFieldResizePreview] = useState(null);
  const [pushPreview, setPushPreview] = useState({}); 
  const pushPreviewRef = React.useRef({});

  // ── Seleção por área (marquee) ──
  const [selectedFields, setSelectedFields]     = useState([]);
  const selectedFieldsRef                       = React.useRef([]);
  const [marquee, setMarquee]                   = useState(null);
  const isMarqueeRef                            = React.useRef(false);
  const marqueeStartRef                         = React.useRef({ x: 0, y: 0 });
  const lastClickTimeRef                        = React.useRef(0);
  const holdTimerRef                            = React.useRef(null);
  
  // ── largura calculada de uma célula do grid (atualizada via ResizeObserver) ──
  const [cellWidth, setCellWidth] = useState(null);

  const isDraggingRef  = React.useRef(false);
  const isResizingRef  = React.useRef(false);
  const gridRef        = React.useRef(null);
  const resizeOrigin   = React.useRef({ col: 1, row: 1 });
  const dragOffsetRef  = React.useRef({ x: 0, y: 0 });
  const ghostSizeRef   = React.useRef({ w: 180, h: 100 });
  const cardSizeRef    = React.useRef(ficha?.cardSize || calcularTamanhoMinimo());
  
  // ── Refs para drag dos campos ──
  const isDraggingFieldRef = React.useRef(false);
  const cardGridRef = React.useRef(null);
  const draggingFieldKeyRef = React.useRef(null);
  
  const dragStartPosRef = React.useRef(null); // posição inicial do campo arrastado
  // ── Refs para resize dos campos ──
  const isResizingFieldRef = React.useRef(false);
  const resizingFieldKeyRef = React.useRef(null);
  const fieldResizeOrigin = React.useRef({ col: 1, row: 1 });
  const fieldResizePreviewRef = React.useRef(null);
  const fieldHoverCellRef = React.useRef(null);

  // ── Refs para detecção de colisão ──
  const fieldPositionsRef = React.useRef(fieldPositions);
  const fieldSizesRef = React.useRef(fieldSizes);

  // Mantém as Refs atualizadas com o state mais recente
  useEffect(() => {
    fieldPositionsRef.current = fieldPositions;
  }, [fieldPositions]);

  useEffect(() => {
    selectedFieldsRef.current = selectedFields;
  }, [selectedFields]);
  
  // ── calcula a largura de uma célula a partir da largura atual do gridRef ──
  const calcCellWidth = useCallback((containerWidth) => {
    const available = containerWidth - GRID_PADDING * 2;
    return (available - GAP * (GRID_COLS - 1)) / GRID_COLS;
  }, []);

  // ── ResizeObserver: atualiza cellWidth sempre que o grid mudar de tamanho ──
  useEffect(() => {
    if (!gridRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setCellWidth(calcCellWidth(w));
      }
    });

    observer.observe(gridRef.current);

    // leitura inicial
    setCellWidth(calcCellWidth(gridRef.current.getBoundingClientRect().width));

    return () => observer.disconnect();
  }, [calcCellWidth]);

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

  // ── Obter célula do grid INTERNO do card (para campos) ──
  const getCellFromPointInCardGrid = (x, y) => {
    if (!cardGridRef.current) return null;
    const rect = cardGridRef.current.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;
    if (relX < 0 || relY < 0) return null;
    
    const availableWidth = rect.width;
    const cellW = cellWidth || (availableWidth / activeSize.cols);
    const gapX = 14;
    const gapY = 8;
    
    const col = Math.floor(relX / (cellW + gapX)) + 1;
    const row = Math.floor(relY / (CELL_H + gapY)) + 1;
    
    // ── CORREÇÃO: clamp para nunca sair dos limites do card ──
    const clampedCol = Math.max(1, Math.min(col, activeSize.cols));
    const clampedRow = Math.max(1, Math.min(row, activeSize.rows - 1));
    
    return { col: clampedCol, row: clampedRow };
  };

  const getOriginCellFromGhost = (mouseX, mouseY) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const offset = dragOffsetRef.current;
    const size   = cardSizeRef.current;

    const ghostLeft = mouseX - offset.x;
    const ghostTop  = mouseY - offset.y;

    const relX = ghostLeft - rect.left - GRID_PADDING;
    const relY = ghostTop  - rect.top  - GRID_PADDING;

    const availableWidth = rect.width - GRID_PADDING * 2;
    const cellW = (availableWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;

    let col = Math.round(relX / (cellW + GAP)) + 1;
    let row = Math.round(relY / (CELL_H + GAP)) + 1;

    col = Math.max(1, Math.min(col, GRID_COLS - size.cols + 1));
    row = Math.max(1, Math.min(row, GRID_ROWS - size.rows + 1));

    return { col, row };
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      // ── Ativa marquee ao arrastar (threshold de 4px) ──
      if (marqueeStartRef.current?._pending && cardGridRef.current) {
        const dx = e.clientX - marqueeStartRef.current._clientX;
        const dy = e.clientY - marqueeStartRef.current._clientY;
        if (Math.sqrt(dx * dx + dy * dy) > 4) {
          marqueeStartRef.current._pending = false;
          isMarqueeRef.current = true;
          setMarquee({ x: marqueeStartRef.current.x, y: marqueeStartRef.current.y, w: 0, h: 0 });
          document.body.classList.add('is-marquee');
        }
      }

      // ── Atualiza marquee ──
      if (isMarqueeRef.current && cardGridRef.current) {
        const rect = cardGridRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const start = marqueeStartRef.current;
        const newMarquee = {
          x: start.x,
          y: start.y,
          w: currentX - start.x,
          h: currentY - start.y,
        };
        setMarquee(newMarquee);

        // ── Atualiza seleção em tempo real ──
        const selLeft   = Math.min(newMarquee.x, newMarquee.x + newMarquee.w);
        const selRight  = Math.max(newMarquee.x, newMarquee.x + newMarquee.w);
        const selTop    = Math.min(newMarquee.y, newMarquee.y + newMarquee.h);
        const selBottom = Math.max(newMarquee.y, newMarquee.y + newMarquee.h);

        const campos = mapearCamposGrid();
        const cw = cellWidth || (rect.width / activeSize.cols);
        const gapX = 14, gapY = 8;

        const selecionados = campos.filter(campo => {
          const pos  = fieldPositionsRef.current[campo.key];
          const size = fieldSizesRef.current[campo.key] || { cols: 1, rows: 1 };
          const fieldLeft   = (pos.col - 1) * (cw + gapX);
          const fieldTop    = (pos.row - 1) * (CELL_H + gapY) + 6;
          const fieldRight  = fieldLeft + cw * size.cols + gapX * (size.cols - 1);
          const fieldBottom = fieldTop  + CELL_H * size.rows + gapY * (size.rows - 1);
          return fieldLeft < selRight && fieldRight > selLeft &&
                 fieldTop  < selBottom && fieldBottom > selTop;
        });

        const novaSelecao = selecionados.map(c => c.key);
        setSelectedFields(novaSelecao);
        selectedFieldsRef.current = novaSelecao;
      }

      if (isDraggingRef.current) {
        setMousePos({ x: e.clientX, y: e.clientY });
        const cell = getOriginCellFromGhost(e.clientX, e.clientY);
        setHoverCell(cell);
      }
      
      // ── REDIMENSIONAMENTO DO CARD PRINCIPAL (COM LIMITES) ──
      if (isResizingRef.current) {
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (cell) {
          const origin = resizeOrigin.current;
          
          let targetCols = Math.max(1, Math.min(cell.col - origin.col + 1, GRID_COLS - origin.col + 1));
          let targetRows = Math.max(1, Math.min(cell.row - origin.row + 1, GRID_ROWS - origin.row + 1));
          
          // 1. Descobrir até onde vão as textboxes internas
          let minCols = 1;
          let minRows = 1;
          const positions = fieldPositionsRef.current;
          const sizes = fieldSizesRef.current;

          for (const key in positions) {
            const p = positions[key];
            const s = sizes[key] || { cols: 1, rows: 1 };
            const endCol = p.col + s.cols - 1;
            const endRow = p.row + s.rows - 1;
            
            if (endCol > minCols) minCols = endCol;
            if (endRow > minRows) minRows = endRow;
          }

          const cardMinRows = minRows + 1;

          let overdragRight = false;
          let overdragBottom = false;

          if (targetCols < minCols) {
            targetCols = minCols;
            overdragRight = true;
          }
          if (targetRows < cardMinRows) {
            targetRows = cardMinRows;
            overdragBottom = true;
          }

          setCardOverdrag({ right: overdragRight, bottom: overdragBottom });
          setResizePreview({ cols: targetCols, rows: targetRows });
        }
      }
      
      // ── ARRASTO COM BLOQUEIO DE SOBREPOSIÇÃO (SEM EMPURRAR) ──
      if (isDraggingFieldRef.current) {
        setFieldMousePos({ x: e.clientX, y: e.clientY });
        const cell = getCellFromPointInCardGrid(e.clientX, e.clientY);
        
        if (cell) {
          const draggingKey = draggingFieldKeyRef.current;
          const size = fieldSizesRef.current[draggingKey] || { cols: 1, rows: 1 };
          const positions = fieldPositionsRef.current;
          const sizes = fieldSizesRef.current;
          const currentCardSize = cardSizeRef.current;
          
          let hasOverlap = false;

          const leftA = cell.col;
          const rightA = cell.col + size.cols - 1;
          const topA = cell.row;
          const bottomA = cell.row + size.rows - 1;

          // 1. Bloquear se tentar sair do Card (considerando tamanho COMPLETO do campo)
          if (
            cell.col < 1 || cell.row < 1 ||
            rightA > currentCardSize.cols ||
            bottomA > currentCardSize.rows - 1
          ) {
            hasOverlap = true;
          } else {
            // 2. Bloquear se bater em outra caixa
            const currentSelected = selectedFieldsRef.current;
            const isGroupDrag = currentSelected.includes(draggingKey) && currentSelected.length > 1;

            for (const key in positions) {
              if (key === draggingKey) continue;
              if (isGroupDrag && currentSelected.includes(key)) continue;

              const posB = positions[key];
              const sizeB = sizes[key] || { cols: 1, rows: 1 };
              
              const leftB = posB.col;
              const rightB = posB.col + sizeB.cols - 1;
              const topB = posB.row;
              const bottomB = posB.row + sizeB.rows - 1;
              
              if (leftA <= rightB && rightA >= leftB && topA <= bottomB && bottomA >= topB) {
                hasOverlap = true;
                break; // Achou uma colisão, já pode parar de procurar e bloquear
              }
            }
          }

          const newHoverCell = { ...cell, isValid: !hasOverlap };
          setFieldHoverCell(newHoverCell);
          fieldHoverCellRef.current = newHoverCell;
        } else {
          setFieldHoverCell(null);
          fieldHoverCellRef.current = null;
        }
      }
      
      // ── REDIMENSIONAMENTO COM BLOQUEIO DE SOBREPOSIÇÃO ──
      if (isResizingFieldRef.current) {
        const cell = getCellFromPointInCardGrid(e.clientX, e.clientY);
        if (cell) {
          const origin = fieldResizeOrigin.current;
          const currentSize = cardSizeRef.current;
          const resizingKey = resizingFieldKeyRef.current;
          
          const maxCols = currentSize.cols - origin.col + 1;
          const maxRows = (currentSize.rows - 1) - origin.row + 1;
          
          // ── CORREÇÃO: clamp DURO — o preview nunca cresce além da borda ──
          const cols = Math.max(1, Math.min(cell.col - origin.col + 1, maxCols));
          const rows = Math.max(1, Math.min(cell.row - origin.row + 1, maxRows));
          
          const positions = fieldPositionsRef.current;
          const sizes = fieldSizesRef.current;

          const leftA = origin.col;
          const rightA = origin.col + cols - 1;
          const topA = origin.row;
          const bottomA = origin.row + rows - 1;

          let hasOverlap = false;

          for (const key in positions) {
            if (key === resizingKey) continue;
            const posB = positions[key];
            const sizeB = sizes[key] || { cols: 1, rows: 1 };
            
            const leftB = posB.col;
            const rightB = posB.col + sizeB.cols - 1;
            const topB = posB.row;
            const bottomB = posB.row + sizeB.rows - 1;
            
            if (leftA <= rightB && rightA >= leftB && topA <= bottomB && bottomA >= topB) {
              hasOverlap = true;
              break;
            }
          }
          
          // ── Borda já foi clamped acima, só invalida se bater em outra caixa ──
          const isValid = !hasOverlap;

          const newPreview = { cols, rows, isValid, hasPush: false };
          setFieldResizePreview(newPreview);
          fieldResizePreviewRef.current = newPreview;
        }
      }
    };

    const onMouseUp = (e) => {
      // ── Finaliza marquee ──
      if (marqueeStartRef.current?._pending) {
        marqueeStartRef.current._pending = false;
      }
      if (isMarqueeRef.current) {
        handleCardGridMouseUp();
        return;
      }

      // 1. Redimensionamento do Card Principal
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.classList.remove('is-resizing');
        
        // Limpa o efeito de mola ao soltar
        setCardOverdrag({ right: false, bottom: false }); 
        
        if (resizePreview) {
          const newSize = { ...resizePreview };
          setCardSize(newSize);
          cardSizeRef.current = newSize;
          requestAnimationFrame(() => setResizePreview(null));
        }
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
        return;
      }
      
      // ── IMPEDIR SALVAMENTO NO ARRASTO ──
      if (isDraggingFieldRef.current) {
        isDraggingFieldRef.current = false;
        const fieldKey = draggingFieldKeyRef.current;
        const finalHover = fieldHoverCellRef.current;
        const startPos = dragStartPosRef.current;

        if (finalHover && fieldKey && finalHover.isValid && startPos) {
          const deltaCol = finalHover.col - startPos.col;
          const deltaRow = finalHover.row - startPos.row;

          const currentSelected = selectedFieldsRef.current;
          const isGroupDrag = currentSelected.includes(fieldKey) && currentSelected.length > 1;

          setFieldPositions(prev => {
            const currentCardSize = cardSizeRef.current;

            if (!isGroupDrag) {
              const size = fieldSizesRef.current[fieldKey] || { cols: 1, rows: 1 };
              const newCol = finalHover.col;
              const newRow = finalHover.row;
              // ── CORREÇÃO: valida que o campo inteiro cabe dentro do card ──
              if (
                newCol < 1 || newRow < 1 ||
                newCol + size.cols - 1 > currentCardSize.cols ||
                newRow + size.rows - 1 > currentCardSize.rows - 1
              ) return prev;
              return { ...prev, [fieldKey]: { col: newCol, row: newRow } };
            }

            const next = { ...prev };

            const algumForaDoLimite = currentSelected.some(key => {
              const pos = prev[key];
              const size = fieldSizesRef.current[key] || { cols: 1, rows: 1 };
              if (!pos) return false;
              const newCol = pos.col + deltaCol;
              const newRow = pos.row + deltaRow;
              return (
                newCol < 1 ||
                newRow < 1 ||
                newCol + size.cols - 1 > currentCardSize.cols ||
                newRow + size.rows - 1 > currentCardSize.rows - 1
              );
            });

            if (algumForaDoLimite) return prev;

            currentSelected.forEach(key => {
              const pos = prev[key];
              if (pos) next[key] = { col: pos.col + deltaCol, row: pos.row + deltaRow };
            });

            return next;
          });
        }

        setDraggingField(null);
        setFieldMousePos({ x: 0, y: 0 });
        setFieldHoverCell(null);
        fieldHoverCellRef.current = null;
        dragStartPosRef.current = null;
        document.body.classList.remove('is-dragging-field');
        return;
      }
      
      // ── SALVAR REDIMENSIONAMENTO E EMPURRÃO DAS CAIXAS ──
      if (isResizingFieldRef.current) {
        isResizingFieldRef.current = false;
        const fieldKey = resizingFieldKeyRef.current;
        const finalPreview = fieldResizePreviewRef.current;
        const finalPush = pushPreviewRef.current;
        
        if (finalPreview && fieldKey && finalPreview.isValid) {
          // 1. Salva o novo tamanho da caixa que foi puxada
          setFieldSizes(prev => ({
            ...prev,
            [fieldKey]: { cols: finalPreview.cols, rows: finalPreview.rows }
          }));
          
          // 2. Efetiva o empurrão nas outras caixas pra posição nova
          if (finalPush && Object.keys(finalPush).length > 0) {
            setFieldPositions(prev => {
              const next = { ...prev };
              for (const key in finalPush) {
                next[key] = { col: finalPush[key].col, row: finalPush[key].row };
              }
              return next;
            });
          }
        }
        
        // Limpa tudo
        setResizingField(null);
        setFieldResizePreview(null);
        fieldResizePreviewRef.current = null;
        setPushPreview({});
        pushPreviewRef.current = {};
        document.body.classList.remove('is-resizing-field');
        return;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizePreview, cellWidth]);

  // ── Drag a partir da SIDEBAR ──
  const handleCardMouseDownSidebar = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();

    // O offset é onde o mouse clicou DENTRO do card da sidebar
    // Assim o fantasma nasce no canto superior esquerdo do card, não no mouse
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDragOffset(offset);
    dragOffsetRef.current = offset;

    setGhostSize({ w: rect.width, h: rect.height });
    ghostSizeRef.current = { w: rect.width, h: rect.height };

    cardSizeRef.current = { ...cardSize };
    setMousePos({ x: e.clientX, y: e.clientY });
    setGhostExpanded(false); // começa pequeno
    setIsDraggingCard(true);
    isDraggingRef.current = true;
    document.body.classList.add('is-dragging');
    // no próximo frame expande para o tamanho real
    requestAnimationFrame(() => setGhostExpanded(true));
  };

  // ── Drag a partir do GRID ──
  const handleCardMouseDownGrid = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();

    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDragOffset(offset);
    dragOffsetRef.current = offset;

    setGhostSize({ w: rect.width, h: rect.height });
    ghostSizeRef.current = { w: rect.width, h: rect.height };

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

  const handleFieldMouseDown = (fieldKey) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardGridRef.current) return;
    
    setDraggingField(fieldKey);
    isDraggingFieldRef.current = true;
    draggingFieldKeyRef.current = fieldKey;
    setFieldMousePos({ x: e.clientX, y: e.clientY });
    document.body.classList.add('is-dragging-field');

    // ── Registra posição inicial do campo arrastado (para calcular delta depois) ──
    const startPos = fieldPositionsRef.current[fieldKey];
    dragStartPosRef.current = startPos ? { ...startPos } : null;
  };

  // ── Inicia marquee com duplo clique + hold ──
  const handleCardGridMouseDown = (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.target.tagName === 'LABEL') return;

    // ── Desseleciona com 1 clique fora das boxes selecionadas ──
    if (selectedFieldsRef.current.length > 0) {
      const clickedField = e.target.closest('[data-field-key]');
      const clickedKey = clickedField?.dataset?.fieldKey;
      if (!clickedKey || !selectedFieldsRef.current.includes(clickedKey)) {
        setSelectedFields([]);
        selectedFieldsRef.current = [];
      }
    }

    if (!cardGridRef.current) return;
    const rect = cardGridRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    // Armazena ponto de início mas NÃO ativa ainda
    marqueeStartRef.current = { x: startX, y: startY };
    marqueeStartRef.current._clientX = e.clientX;
    marqueeStartRef.current._clientY = e.clientY;
    marqueeStartRef.current._pending = true;
  };

  const handleCardGridMouseUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (!isMarqueeRef.current) return;
    isMarqueeRef.current = false;
    document.body.classList.remove('is-marquee');

    // Calcular quais campos estão dentro da marquee
    setMarquee(prev => {
      if (!prev || !cardGridRef.current) return null;

      const rect = cardGridRef.current.getBoundingClientRect();
      const selLeft   = Math.min(prev.x, prev.x + prev.w);
      const selRight  = Math.max(prev.x, prev.x + prev.w);
      const selTop    = Math.min(prev.y, prev.y + prev.h);
      const selBottom = Math.max(prev.y, prev.y + prev.h);

      const campos = mapearCamposGrid();
      const cw = cellWidth || (rect.width / activeSize.cols);
      const gapX = 14, gapY = 8;

      const selecionados = campos.filter(campo => {
        const pos  = fieldPositionsRef.current[campo.key];
        const size = fieldSizesRef.current[campo.key] || { cols: 1, rows: 1 };

        const fieldLeft   = (pos.col - 1) * (cw + gapX);
        const fieldTop    = (pos.row - 1) * (CELL_H + gapY) + 6;
        const fieldRight  = fieldLeft + cw * size.cols + gapX * (size.cols - 1);
        const fieldBottom = fieldTop  + CELL_H * size.rows + gapY * (size.rows - 1);

        return fieldLeft < selRight && fieldRight > selLeft &&
               fieldTop  < selBottom && fieldBottom > selTop;
      });

      setSelectedFields(selecionados.map(c => c.key));
      return null;
    });
  };

  const handleFieldResizeMouseDown = (fieldKey) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardGridRef.current) return;
    
    const fieldPos = fieldPositions[fieldKey];
    if (!fieldPos) return;
    
    resizingFieldKeyRef.current = fieldKey;
    fieldResizeOrigin.current = { col: fieldPos.col, row: fieldPos.row };
    
    // ── CORREÇÃO: Forçar isValid: true no momento do clique inicial ──
    const initialSize = fieldSizes[fieldKey] || { cols: 1, rows: 1 };
    const initialPreview = { ...initialSize, isValid: true };
    
    setFieldResizePreview(initialPreview);
    fieldResizePreviewRef.current = initialPreview; 
    // ─────────────────────────────────────────────────────────────────
    
    setResizingField(fieldKey);
    isResizingFieldRef.current = true;
    document.body.classList.add('is-resizing-field');
  };

  const activeSize = resizePreview || cardSize;

  const cardOccupies = (col, row) => {
    if (!cardMovelPos) return false;
    return (
      col >= cardMovelPos.col &&
      col < cardMovelPos.col + activeSize.cols &&
      row >= cardMovelPos.row &&
      row < cardMovelPos.row + activeSize.rows
    );
  };

  const isDropPreview = (col, row) => {
    if (!isDraggingCard || !hoverCell) return false;
    return (
      col >= hoverCell.col &&
      col < hoverCell.col + cardSize.cols &&
      row >= hoverCell.row &&
      row < hoverCell.row + cardSize.rows
    );
  };

  // ── Mapeamento de campos para posições no grid interno ──
  const mapearCamposGrid = () => {
    const campos = [
      { key: 'nome', label: 'Nome', placeholder: 'Digite o nome' },
      { key: 'classe', label: 'Classe', placeholder: 'Ex: Mago' },
      { key: 'nivel', label: 'Nível', placeholder: 'Ex: 1' },
      { key: 'alinhamento', label: 'Alinhamento', placeholder: 'Ex: Neutro' },
      { key: 'idade', label: 'Idade', placeholder: 'Ex: 25' },
      { key: 'xp', label: 'XP', placeholder: 'Ex: 0' },
    ];
    
    // Adicionar posição e tamanho do estado
    return campos.map(campo => ({
      ...campo,
      ...(fieldPositions[campo.key] || { col: 1, row: 1 }),
      ...(fieldSizes[campo.key] || { cols: 1, rows: 1 })
    })).filter(campo => campo.col <= activeSize.cols && campo.row <= activeSize.rows - 1);
  };

  const handleFieldChange = (key, value) => {
    setFichaData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // ── ALINHAMENTO PERFEITO COM O GRID ──
  // Cada campo deve ter exatamente a mesma largura de uma célula do grid
  // O gap entre campos deve ser igual ao gap do grid
  // Padding interno do card deve ser 0 para perfeito alinhamento
  
  const fieldCols = activeSize.cols;
  const fieldBoxWidth = cellWidth; // Mesma largura exata da célula do grid

  return (
    <div style={{ ...styles.detailContainer, userSelect: 'none' }}>
      <div style={styles.detailContent}>

        {/* ── Sidebar ── */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarContent}>
            <button onClick={onBack} style={styles.backButtonSidebar}>← Voltar</button>

            <button 
              onClick={() => onUpdate(ficha.id, { cardMovelPos, cardSize, fieldPositions, fieldSizes, ...fichaData })} 
              style={{
                ...styles.buttonPrimary,
                marginTop: '0.5rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              💾 Salvar Alterações
            </button>

            <div style={{ fontSize: '0.85rem', color: theme.colors.text, opacity: 0.6, marginTop: '1rem', padding: '1rem', borderTop: `1px solid ${theme.colors.borderLight}` }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>💡 Dica:</p>
              <p style={{ margin: 0 }}>Arraste para o grid e redimensione pelo canto ↘</p>
            </div>

            {!cardMovelPos && (
            <div
              onMouseDown={handleCardMouseDownSidebar}
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
                    ...(ocupado
                      ? { opacity: 0 }
                      : { opacity: GRID_CONFIG.opacidadeCelula }
                    ),
                  }}
                >
                  {GRID_CONFIG.mostrarTextoCelula && (
                    <div style={styles.spaceCardContent}>
                      C:{espaco.col} L:{espaco.row}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Preview unificado do drop */}
            {isDraggingCard && hoverCell && (
              <div
                style={{
                  gridColumn: `${hoverCell.col} / span ${cardSize.cols}`,
                  gridRow: `${hoverCell.row} / span ${cardSize.rows}`,
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.18) 100%)',
                  border: '2px solid rgba(251, 191, 36, 0.85)',
                  boxShadow: '0 0 24px rgba(251, 191, 36, 0.35)',
                  transition: 'all 0.1s ease',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            )}

            {/* ✨ AQUI ESTÁ A MAGIA ✨ -> Card posicionado no grid (com as classes) */}
            {cardMovelPos && (
              <div
                onMouseDown={handleCardMouseDownGrid}
                className={`card-bounce-transition ${
                  cardOverdrag.right && cardOverdrag.bottom ? 'card-bounce-both' : 
                  cardOverdrag.right ? 'card-bounce-right' : 
                  cardOverdrag.bottom ? 'card-bounce-bottom' : ''
                }`}
                style={{
                  ...styles.cardMovel,
                  gridColumn: `${cardMovelPos.col} / span ${activeSize.cols}`,
                  gridRow:    `${cardMovelPos.row} / span ${activeSize.rows}`,
                  margin: '0px',
                  cursor: isDraggingCard ? 'grabbing' : 'grab',
                  opacity: isDraggingCard ? 0.6 : 1,
                  overflow: 'hidden',
                  zIndex: 2,
                  flexDirection: 'column',
                  display: 'flex',
                  padding: '0px',
                }}
              >
                <div style={styles.cardMovelHeader}>
                  <h4 style={styles.cardMovelTitle}>INFORMAÇÕES BÁSICAS</h4>
                </div>

                {/* GRID INTERNO COM CAMPOS */}
                <div
                  ref={cardGridRef}
                  onMouseDown={(e) => { e.stopPropagation(); handleCardGridMouseDown(e); }}
                  style={{
                    display: 'grid',
                    // Mesmo número de colunas do card
                    gridTemplateColumns: fieldBoxWidth != null
                      ? `repeat(${activeSize.cols}, ${fieldBoxWidth}px)`
                      : `repeat(${activeSize.cols}, 1fr)`,
                    // Mesmo número de linhas do card, menos 1 do cabeçalho
                    gridTemplateRows: `repeat(${activeSize.rows - 1}, ${CELL_H}px)`,
                    // Gap idêntico ao grid externo
                    gap: `14px`,
                    rowGap: '8px',
                    // Sem padding para perfeito alinhamento
                    padding: '0px',
                    width: '100%',
                    boxSizing: 'border-box',
                    alignContent: 'start',
                    margin: '0px',
                    flex: 1,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Renderizar campos nos espaços corretos */}
                  {mapearCamposGrid().map((campo) => {
                    const fieldPos = fieldPositions[campo.key];
                    const fieldSize = fieldSizes[campo.key];
                    const isGroupDrag = selectedFieldsRef.current.includes(draggingField) && selectedFieldsRef.current.length > 1;
                    const isCurrentlyDragging = draggingField === campo.key || (isGroupDrag && selectedFieldsRef.current.includes(campo.key));
                    const isCurrentlyResizing = resizingField === campo.key;
                    
                    // ── MANTÉM O TAMANHO ORIGINAL DURANTE O RESIZE PARA A CAIXA NÃO PULAR ──
                    const activeFieldSize = fieldSize;
                    
                    const isSelected = selectedFields.includes(campo.key);

                    return (
                      <div
                        key={campo.key}
                        data-field-key={campo.key}
                        style={{
                          gridColumn: `${fieldPos.col} / span ${activeFieldSize.cols}`,
                          gridRow: `${fieldPos.row} / span ${activeFieldSize.rows}`,
                          margin: '0px',
                          marginTop: '6px',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          opacity: isCurrentlyDragging ? 0.4 : 1,
                          transition: 'opacity 0.15s ease, outline 0.15s ease',
                          position: 'relative',
                          minHeight: `${CELL_H}px`,
                          outline: isSelected ? '2px solid rgba(139, 92, 246, 0.9)' : 'none',
                          boxShadow: isSelected ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none',
                        }}
                      >
                        <GridInputField
                          label={campo.label}
                          value={fichaData[campo.key]}
                          onChange={(e) => handleFieldChange(campo.key, e.target.value)}
                          placeholder={campo.placeholder}
                          onLabelMouseDown={handleFieldMouseDown(campo.key)}
                        />
                        
                        {/* Botão de resize no canto inferior direito */}
                        <div
                          onMouseDown={handleFieldResizeMouseDown(campo.key)}
                          title="Redimensionar"
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            width: 16,
                            height: 16,
                            cursor: 'nwse-resize',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isCurrentlyResizing ? 1 : 0.5,
                            transition: 'opacity 0.2s',
                            zIndex: 10,
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => { if (!isCurrentlyResizing) e.currentTarget.style.opacity = 0.5; }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <line x1="12" y1="4"  x2="4"  y2="12" stroke="#E8D5F0" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="12" y1="8"  x2="8"  y2="12" stroke="#E8D5F0" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="12" y1="12" x2="12" y2="12" stroke="#E8D5F0" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    );
                  })}

                  {/* Preview das células enquanto arrasta um campo — GRUPO */}
                  {draggingField && fieldHoverCell && selectedFieldsRef.current.includes(draggingField) && selectedFieldsRef.current.length > 1 &&
                    selectedFieldsRef.current.map(key => {
                      const pos = fieldPositions[key];
                      const size = fieldSizes[key] || { cols: 1, rows: 1 };
                      const startPos = dragStartPosRef.current;
                      const deltaCol = startPos ? fieldHoverCell.col - startPos.col : 0;
                      const deltaRow = startPos ? fieldHoverCell.row - startPos.row : 0;
                      const previewCol = pos.col + deltaCol;
                      const previewRow = pos.row + deltaRow;
                      return (
                        <div
                          key={`group-preview-${key}`}
                          style={{
                            gridColumn: `${previewCol} / span ${size.cols}`,
                            gridRow: `${previewRow} / span ${size.rows}`,
                            margin: '0px',
                            marginTop: '6px',
                            borderRadius: '0.5rem',
                            boxSizing: 'border-box',
                            background: fieldHoverCell.isValid !== false
                              ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.18) 100%)'
                              : 'linear-gradient(135deg, rgba(248, 113, 113, 0.18) 0%, rgba(220, 38, 38, 0.18) 100%)',
                            border: fieldHoverCell.isValid !== false
                              ? '2px solid rgba(251, 191, 36, 0.85)'
                              : '2px solid rgba(248, 113, 113, 0.85)',
                            boxShadow: fieldHoverCell.isValid !== false
                              ? '0 0 16px rgba(251, 191, 36, 0.35)'
                              : '0 0 16px rgba(248, 113, 113, 0.35)',
                            transition: 'all 0.1s ease',
                            pointerEvents: 'none',
                            zIndex: 5,
                          }}
                        />
                      );
                    })
                  }
                  {/* Preview das células enquanto arrasta um campo — INDIVIDUAL */}
                  {draggingField && fieldHoverCell && !(selectedFieldsRef.current.includes(draggingField) && selectedFieldsRef.current.length > 1) && (
                    <div
                      style={{
                        gridColumn: `${fieldHoverCell.col} / span ${fieldSizes[draggingField]?.cols || 1}`,
                        gridRow: `${fieldHoverCell.row} / span ${fieldSizes[draggingField]?.rows || 1}`,
                        margin: '0px',
                        marginTop: '6px',
                        height: (fieldSizes[draggingField]?.rows || 1) === 1 
                          ? 'calc(100% - 6px + 4px)' 
                          : 'calc(100% - 6px)',
                        borderRadius: '0.5rem',
                        boxSizing: 'border-box',
                        background: fieldHoverCell.isValid !== false
                          ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.18) 100%)' 
                          : 'linear-gradient(135deg, rgba(248, 113, 113, 0.18) 0%, rgba(220, 38, 38, 0.18) 100%)',
                        border: fieldHoverCell.isValid !== false
                          ? '2px solid rgba(251, 191, 36, 0.85)' 
                          : '2px solid rgba(248, 113, 113, 0.85)',
                        boxShadow: fieldHoverCell.isValid !== false
                          ? '0 0 16px rgba(251, 191, 36, 0.35)' 
                          : '0 0 16px rgba(248, 113, 113, 0.35)',
                        transition: 'all 0.1s ease',
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}
                    />
                  )}

                  {/* Preview das células enquanto redimensiona um campo */}
                  {resizingField && fieldResizePreview && (() => {
                    // Calculamos a largura e altura exatas em pixels baseadas no grid para animar suavemente
                    const rect = cardGridRef.current?.getBoundingClientRect();
                    const cw = cellWidth || (rect ? rect.width / activeSize.cols : 80);
                    const gapX = 14, gapY = 8;
                    const pos = fieldPositions[resizingField];
                    
                    const leftPx = (pos.col - 1) * (cw + gapX);
                    const topPx = (pos.row - 1) * (CELL_H + gapY) + 6; 
                    
                    const wPx = cw * fieldResizePreview.cols + gapX * (fieldResizePreview.cols - 1);
                    const hPx = (CELL_H * fieldResizePreview.rows) + (gapY * (fieldResizePreview.rows - 1)) - 6;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${leftPx}px`,
                          top: `${topPx}px`,
                          width: `${wPx}px`,
                          height: `${hPx}px`,
                          borderRadius: '0.5rem',
                          background: fieldResizePreview.isValid 
                            ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.18) 0%, rgba(34, 197, 94, 0.18) 100%)' 
                            : 'linear-gradient(135deg, rgba(248, 113, 113, 0.18) 0%, rgba(220, 38, 38, 0.18) 100%)',
                          border: fieldResizePreview.isValid 
                            ? '2px solid rgba(74, 222, 128, 0.85)' 
                            : '2px solid rgba(248, 113, 113, 0.85)',
                          boxShadow: fieldResizePreview.isValid 
                            ? '0 0 16px rgba(74, 222, 128, 0.35)' 
                            : '0 0 16px rgba(248, 113, 113, 0.35)',
                          
                          // ✨ AQUI ESTÁ A MÁGICA DA FLUIDEZ ✨
                          transition: 'width 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.2s ease, border 0.2s ease',
                          pointerEvents: 'none',
                          zIndex: 5,
                        }}
                      />
                    );
                  })()}

                  {/* Retângulo de seleção marquee */}
                  {marquee && (
                    <div
                      style={{
                        position: 'absolute',
                        left:   `${Math.min(marquee.x, marquee.x + marquee.w)}px`,
                        top:    `${Math.min(marquee.y, marquee.y + marquee.h)}px`,
                        width:  `${Math.abs(marquee.w)}px`,
                        height: `${Math.abs(marquee.h)}px`,
                        border: '2px dashed rgba(139, 92, 246, 0.9)',
                        borderRadius: '4px',
                        background: 'rgba(139, 92, 246, 0.08)',
                        pointerEvents: 'none',
                        zIndex: 20,
                        boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.2)',
                      }}
                    />
                  )}

                  {/* Preencher espaços vazios com placeholders */}
                  {Array.from({ length: activeSize.cols * (activeSize.rows - 1) }).map((_, idx) => {
                    const col = (idx % activeSize.cols) + 1;
                    const row = Math.floor(idx / activeSize.cols) + 1;
                    
                    // Verificar se há um campo nessa posição
                    const temCampo = mapearCamposGrid().some(c => {
                      const fieldSize = fieldSizes[c.key];
                      return (col >= c.col && col < c.col + fieldSize.cols &&
                              row >= c.row && row < c.row + fieldSize.rows);
                    });
                    
                    // Verificar se é preview de drag
                    const isPreviewDrag = fieldHoverCell && 
                      col >= fieldHoverCell.col && 
                      col < fieldHoverCell.col + (fieldSizes[draggingField]?.cols || 1) &&
                      row >= fieldHoverCell.row && 
                      row < fieldHoverCell.row + (fieldSizes[draggingField]?.rows || 1);
                    
                    // Verificar se é preview de resize
                    const isPreviewResize = resizingField && fieldResizePreview &&
                      col >= fieldPositions[resizingField].col &&
                      col < fieldPositions[resizingField].col + fieldResizePreview.cols &&
                      row >= fieldPositions[resizingField].row &&
                      row < fieldPositions[resizingField].row + fieldResizePreview.rows;
                    
                    if (temCampo || isPreviewDrag || isPreviewResize) return null;
                    
                    return (
                      <div
                        key={`placeholder-${idx}`}
                        style={{
                          ...styles.spaceCard,
                          height: `${CELL_H}px`,
                          gridColumn: col,
                          gridRow: row,
                          margin: '0px',
                          marginTop: '6px',
                          borderRadius: '0.5rem',
                          opacity: GRID_INTERNO_CONFIG.opacidadeCelula,
                        }}
                      >
                        {GRID_INTERNO_CONFIG.mostrarTextoCelula && (
                          <div style={styles.spaceCardContent}>
                            {col}:{row}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Campo fantasma durante drag */}
                {draggingField && selectedFieldsRef.current.includes(draggingField) && selectedFieldsRef.current.length > 1 && selectedFieldsRef.current.map(key => {
                  const campo = mapearCamposGrid().find(c => c.key === key);
                  if (!campo) return null;
                  const pos = fieldPositions[key];
                  const size = fieldSizes[key] || { cols: 1, rows: 1 };
                  const startPos = dragStartPosRef.current;
                  const rect = cardGridRef.current?.getBoundingClientRect();
                  const cw = cellWidth || (rect ? rect.width / activeSize.cols : 80);
                  const gapX = 14, gapY = 8;
                  // Offset de cada campo em relação ao campo arrastado (em px)
                  const draggedPos = startPos;
                  const offsetCol = draggedPos ? pos.col - draggedPos.col : 0;
                  const offsetRow = draggedPos ? pos.row - draggedPos.row : 0;
                  const offsetX = offsetCol * (cw + gapX);
                  const offsetY = offsetRow * (CELL_H + gapY);
                  const ghostLeft = fieldMousePos.x - 60 + offsetX;
                  const ghostTop  = fieldMousePos.y - 10 + offsetY;
                  return (
                    <div
                      key={key}
                      style={{
                        position: 'fixed',
                        left: `${ghostLeft}px`,
                        top: `${ghostTop}px`,
                        width: `${cw * size.cols + gapX * (size.cols - 1)}px`,
                        height: `${CELL_H * size.rows + gapY * (size.rows - 1)}px`,
                        background: 'linear-gradient(135deg, rgba(232, 213, 240, 0.25) 0%, rgba(107, 91, 149, 0.25) 100%)',
                        border: '1px solid rgba(232, 213, 240, 0.4)',
                        borderRadius: '0.5rem',
                        pointerEvents: 'none',
                        zIndex: 10000,
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: '#E8D5F0',
                        fontWeight: '600',
                        boxShadow: '0 8px 24px rgba(232, 213, 240, 0.25)',
                      }}
                    >
                      {campo.label}
                    </div>
                  );
                })}
                {draggingField && !(selectedFieldsRef.current.includes(draggingField) && selectedFieldsRef.current.length > 1) && (() => {
                  const rect = cardGridRef.current?.getBoundingClientRect();
                  const cw = cellWidth || (rect ? rect.width / activeSize.cols : 80);
                  const gapX = 14, gapY = 8;
                  const size = fieldSizes[draggingField] || { cols: 1, rows: 1 };
                  const ghostW = cw * size.cols + gapX * (size.cols - 1);
                  const ghostH = CELL_H * size.rows + gapY * (size.rows - 1);
                  return (
                    <div
                      style={{
                        position: 'fixed',
                        left: `${fieldMousePos.x - ghostW / 2}px`,
                        top: `${fieldMousePos.y - 10}px`,
                        width: `${ghostW}px`,
                        height: `${ghostH}px`,
                        background: 'linear-gradient(135deg, rgba(232, 213, 240, 0.25) 0%, rgba(107, 91, 149, 0.25) 100%)',
                        border: '1px solid rgba(232, 213, 240, 0.4)',
                        borderRadius: '0.5rem',
                        pointerEvents: 'none',
                        zIndex: 10000,
                        opacity: 0.7,
                        cursor: 'grabbing',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: '#E8D5F0',
                        fontWeight: '600',
                        boxShadow: '0 8px 24px rgba(232, 213, 240, 0.25)',
                      }}
                    >
                      {mapearCamposGrid().find(c => c.key === draggingField)?.label}
                    </div>
                  );
                })()}
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

          {/* Card fantasma */}
          {isDraggingCard && (
            <div
              style={{
                ...styles.cardMovel,
                position: 'fixed',
                left: `${mousePos.x - dragOffset.x}px`,
                top:  `${mousePos.y - dragOffset.y}px`,
                width: !cardMovelPos
                  ? ghostExpanded
                    ? `${(cellWidth * activeSize.cols) + (GAP * (activeSize.cols - 1))}px`
                    : `${ghostSize.w}px`
                  : `${ghostSize.w}px`,
                height: !cardMovelPos
                  ? ghostExpanded
                    ? `${(CELL_H * activeSize.rows) + (GAP * (activeSize.rows - 1))}px`
                    : `${ghostSize.h}px`
                  : `${ghostSize.h}px`,
                pointerEvents: 'none',
                zIndex: 9999,
                opacity: 0.8,
                cursor: 'grabbing',
                boxShadow: '0 20px 40px rgba(232, 213, 240, 0.4)',
                transition: isDraggingCard && !cardMovelPos
                  ? 'width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  : 'none',
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
    let unsubscribe;

    const carregarFichas = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'fichas'), orderBy('dataCriacao', 'desc'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const fichasData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setFichas(fichasData);
          setLoading(false);
        });

      } catch (error) {
        console.error('Erro ao carregar fichas:', error);
        setLoading(false);
        mostrarToast('Erro ao carregar fichas', 'error');
      }
    };

    carregarFichas();

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
        idade: '',
        cardMovelPos: null,
        cardSize: { cols: 2, rows: 4 }
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
          onUpdate={async (fichaId, dadosAtualizados) => {
            try {
              const fichaRef = doc(db, 'fichas', fichaId);
              await updateDoc(fichaRef, {
                ...dadosAtualizados,
                ultimaEdicao: new Date()
              });
              setSelectedFicha(prev => ({ ...prev, ...dadosAtualizados }));
              mostrarToast('Ficha atualizada com sucesso!', 'success');
            } catch (error) {
              console.error('Erro ao salvar ficha:', error);
              mostrarToast('Erro ao salvar ficha', 'error');
            }
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
    opacity: GRID_CONFIG.opacidadeCelula,
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
    border: 'none',
    borderRadius: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'grab',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 0 0 2px rgba(232, 213, 240, 0.2), 0 4px 12px rgba(232, 213, 240, 0.15)',
    userSelect: 'none',
    padding: '0px',
    margin: '0px',
  },
  cardMovelHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: `${CELL_H}px`,
    flexShrink: 0,
    padding: '0px',
    margin: '0px',
    borderBottom: `1px solid rgba(232, 213, 240, 0.3)`,
  },
  cardMovelTitle: {
    margin: 0,
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#E8D5F0',
    textAlign: 'center',
    letterSpacing: '0.5px',
  },

  // ============ CAMPOS DO GRID INTERNO ============
  gridFieldLabel: {
    fontSize: '0.65rem',
    fontWeight: '600',
    color: '#E8D5F0',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
    opacity: 0.8,
    margin: '0 0 1px 0',
    padding: '0 2px',
  },
  gridFieldInput: {
    width: '100%',
    height: '100%',
    padding: '2px 6px',
    marginTop: '-6px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: `1px solid rgba(232, 213, 240, 0.3)`,
    borderRadius: '3px',
    color: '#E8D5F0',
    fontSize: '1.0rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxSizing: 'border-box',
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
};

// Adicionar keyframes para animações
const globalStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* 🔽 CSS DA MOLA ATUALIZADO (Inclui as transições base para nada quebrar) 🔽 */
  .card-bounce-transition {
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease, opacity 0.15s ease, grid-column 0.1s ease, grid-row 0.1s ease !important;
    transform-origin: top left;
  }
  
  .card-bounce-right {
    transform: scaleX(0.97); /* Encolhe ~10px na direita */
    box-shadow: inset -24px 0 24px -12px rgba(248, 113, 113, 0.6), inset 0 0 0 2px rgba(248, 113, 113, 0.8) !important;
  }
  
  .card-bounce-bottom {
    transform: scaleY(0.97); /* Encolhe ~10px na base */
    box-shadow: inset 0 -24px 24px -12px rgba(248, 113, 113, 0.6), inset 0 0 0 2px rgba(248, 113, 113, 0.8) !important;
  }
  
  .card-bounce-both {
    transform: scale(0.97);
    box-shadow: inset -24px -24px 24px -12px rgba(248, 113, 113, 0.6), inset 0 0 0 2px rgba(248, 113, 113, 0.8) !important;
  }
  /* 🔼 ==================================================================== 🔼 */
  
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

  body.is-dragging-field,
  body.is-dragging-field * {
    cursor: grabbing !important;
  }

  body.is-resizing-field,
  body.is-resizing-field * {
    cursor: nwse-resize !important;
  }

  .card-field-input:focus {
    border-color: rgba(232, 213, 240, 0.5) !important;
    background: rgba(0, 0, 0, 0.5) !important;
  }

  body.is-marquee,
  body.is-marquee * {
    cursor: crosshair !important;
    user-select: none !important;
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}

export default EnnoisSite;
