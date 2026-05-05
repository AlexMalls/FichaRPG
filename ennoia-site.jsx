import React, { useState, useEffect } from 'react';

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
    setFichas([...fichas, { id: Date.now(), nome: nomeFicha }]);
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
          <svg width="120" height="120" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="90" fill="none" stroke="url(#grad)" strokeWidth="18" />
            <circle cx="100" cy="80" r="12" fill="#E8D5F0" />
            <path d="M 100 110 Q 110 130 100 150" fill="none" stroke="url(#grad)" strokeWidth="16" strokeLinecap="round" />
            <circle cx="130" cy="140" r="6" fill="#C4A7D6" opacity="0.7" />
            <circle cx="138" cy="155" r="6" fill="#A89BC4" opacity="0.6" />
            <circle cx="146" cy="170" r="6" fill="#8C7FB2" opacity="0.5" />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#E8D5F0', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#6B5B95', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
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
                borderBottom: currentPage === 'fichas' ? '2px solid #E8D5F0' : 'none'
              }}
              onClick={() => setCurrentPage('fichas')}
            >
              Suas Fichas
            </button>
            <button 
              style={{
                ...styles.navButton,
                borderBottom: currentPage === 'opcoes' ? '2px solid #E8D5F0' : 'none'
              }}
              onClick={() => setCurrentPage('opcoes')}
            >
              Opções
            </button>
            <button 
              style={{
                ...styles.navButton,
                borderBottom: currentPage === 'creditos' ? '2px solid #E8D5F0' : 'none'
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
                    <button 
                      style={styles.newFichaButton}
                      onClick={() => setShowNewFichaForm(true)}
                    >
                      + Nova Ficha
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={styles.fichasList}>
                      {fichas.map(ficha => (
                        <div key={ficha.id} style={styles.fichaItem}>
                          {ficha.nome}
                        </div>
                      ))}
                    </div>
                    {!showNewFichaForm && (
                      <button 
                        style={styles.newFichaButton}
                        onClick={() => setShowNewFichaForm(true)}
                      >
                        + Nova Ficha
                      </button>
                    )}
                  </>
                )}
                
                {showNewFichaForm && (
                  <form onSubmit={handleNewFicha} style={styles.form}>
                    <input
                      type="text"
                      name="nome"
                      placeholder="Nome da ficha"
                      style={styles.input}
                      required
                      autoFocus
                    />
                    <div style={styles.formButtons}>
                      <button type="submit" style={styles.submitButton}>Criar</button>
                      <button 
                        type="button" 
                        style={styles.cancelButton}
                        onClick={() => setShowNewFichaForm(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
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
                  <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={styles.creditsLogo}>
                    <circle cx="100" cy="100" r="90" fill="none" stroke="url(#grad)" strokeWidth="18" />
                    <circle cx="100" cy="80" r="12" fill="#E8D5F0" />
                    <path d="M 100 110 Q 110 130 100 150" fill="none" stroke="url(#grad)" strokeWidth="16" strokeLinecap="round" />
                    <circle cx="130" cy="140" r="6" fill="#C4A7D6" opacity="0.7" />
                    <circle cx="138" cy="155" r="6" fill="#A89BC4" opacity="0.6" />
                    <circle cx="146" cy="170" r="6" fill="#8C7FB2" opacity="0.5" />
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#E8D5F0', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#6B5B95', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                  </svg>
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

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(135deg, #0f0a1a 0%, #1a0f2e 100%)',
    color: '#E8D5F0',
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
    background: 'linear-gradient(135deg, #0f0a1a 0%, #1a0f2e 100%)',
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
    borderBottom: '1px solid rgba(232, 213, 240, 0.1)',
  },
  navButton: {
    background: 'none',
    border: 'none',
    color: '#E8D5F0',
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
  newFichaButton: {
    background: 'linear-gradient(135deg, #E8D5F0 0%, #6B5B95 100%)',
    border: 'none',
    color: '#0f0a1a',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  },
  fichasList: {
    marginBottom: '2rem',
  },
  fichaItem: {
    padding: '1rem',
    background: 'rgba(232, 213, 240, 0.05)',
    border: '1px solid rgba(232, 213, 240, 0.2)',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem',
    background: 'rgba(232, 213, 240, 0.05)',
    border: '1px solid rgba(232, 213, 240, 0.3)',
    borderRadius: '0.5rem',
    color: '#E8D5F0',
    fontSize: '1rem',
  },
  formButtons: {
    display: 'flex',
    gap: '1rem',
  },
  submitButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #E8D5F0 0%, #6B5B95 100%)',
    border: 'none',
    color: '#0f0a1a',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'rgba(232, 213, 240, 0.1)',
    border: '1px solid rgba(232, 213, 240, 0.3)',
    color: '#E8D5F0',
    borderRadius: '0.5rem',
    cursor: 'pointer',
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