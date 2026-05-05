'use client'

import React, { useState, useEffect } from 'react';

// ============ TEMA CENTRALIZADO ============
const theme = {
  colors: {
    bg: 'linear-gradient(135deg, #0f0a1a 0%, #1a0f2e 100%)',
    text: '#E8D5F0',
    accent: 'linear-gradient(135deg, #E8D5F0 0%, #6B5B95 100%)',
    border: 'rgba(232, 213, 240, 0.3)',
    borderLight: 'rgba(232, 213, 240, 0.1)',
    bgDark: 'rgba(232, 213, 240, 0.05)',
  }
};

// ============ COMPONENTES REUTILIZÁVEIS ============

// Box base para formulários
const FormBox = ({ children }) => (
  <div style={styles.formBox}>
    {children}
  </div>
);

// Input customizado
const Input = ({ label, ...props }) => (
  <div style={styles.inputGroup}>
    {label && <label style={styles.label}>{label}</label>}
    <input style={styles.input} {...props} />
  </div>
);

// Select customizado
const Select = ({ label, options, ...props }) => (
  <div style={styles.inputGroup}>
    {label && <label style={styles.label}>{label}</label>}
    <div style={styles.selectWrapper}>
      <select style={styles.select} {...props}>
        <option value="">Selecione um modelo</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <span style={styles.selectArrow}>▼</span>
    </div>
  </div>
);

// Botão primário
const ButtonPrimary = ({ children, ...props }) => (
  <button style={styles.buttonPrimary} {...props}>{children}</button>
);

// Botão secundário
const ButtonSecondary = ({ children, ...props }) => (
  <button style={styles.buttonSecondary} {...props}>{children}</button>
);

// ============ COMPONENTE PRINCIPAL ============
const EnnoisSite = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentPage, setCurrentPage] = useState('fichas');
  const [fichas, setFichas] = useState([]);
  const [showNewFichaForm, setShowNewFichaForm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleNewFicha = (e) => {
    e.preventDefault();
    const nomeFicha = e.target.nome.value;
    const modeloFicha = e.target.modelo.value;
    setFichas([...fichas, { id: Date.now(), nome: nomeFicha, modelo: modeloFicha }]);
    setShowNewFichaForm(false);
    e.target.reset();
  };

  return (
    <div style={styles.container}>
      {/* Tela de Boas-vindas */}
      <div style={{
        ...styles.welcome,
        opacity: showWelcome ? 1 : 0,
        pointerEvents: showWelcome ? 'auto' : 'none',
        transition: 'opacity 1s ease-out'
      }}>
        <div style={styles.welcomeLogo}>
          <img src="/images/logo.png" width="120" height="120" alt="Ennoia" />
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
                {fichas.length === 0 && !showNewFichaForm ? (
                  <div style={styles.empty}>
                    <ButtonPrimary onClick={() => setShowNewFichaForm(true)}>
                      + Nova Ficha
                    </ButtonPrimary>
                  </div>
                ) : (
                  <>
                    <div style={styles.fichasList}>
                      {fichas.map(ficha => (
                        <div key={ficha.id} style={styles.fichaItem}>
                          <div style={{fontWeight: '600'}}>{ficha.nome}</div>
                          <div style={{fontSize: '0.9rem', opacity: 0.7}}>Modelo: {ficha.modelo}</div>
                        </div>
                      ))}
                    </div>
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
                        options={['D&D 5e']}
                        required
                      />
                      <div style={styles.formButtons}>
                        <ButtonPrimary type="submit">Criar</ButtonPrimary>
                        <ButtonSecondary 
                          type="button"
                          onClick={() => setShowNewFichaForm(false)}
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
                  <img src="/images/logo.png" width="80" height="80" alt="Ennoia" style={styles.creditsLogo} />
                  <p style={styles.creditsText}>Site desenvolvido por Ennoia</p>
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
    maxWidth: '600px',
    margin: '0 auto',
  },
  empty: {
    display: 'flex',
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
  selectWrapper: {
    position: 'relative',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.5rem',
    color: theme.colors.text,
    fontSize: '1rem',
    cursor: 'pointer',
    appearance: 'none',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  selectArrow: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: theme.colors.text,
    fontSize: '0.75rem',
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
  formButtons: {
    display: 'flex',
    gap: '1rem',
  },

  // ============ OUTROS ELEMENTOS ============
  fichasList: {
    marginBottom: '2rem',
  },
  fichaItem: {
    padding: '1rem',
    background: theme.colors.bgDark,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '0.5rem',
    marginBottom: '1rem',
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
    gap: '2rem',
    marginTop: '3rem',
  },
  creditsLogo: {
    opacity: 0.8,
  },
  creditsText: {
    fontSize: '1.1rem',
    fontWeight: '500',
  },
};

export default EnnoisSite;