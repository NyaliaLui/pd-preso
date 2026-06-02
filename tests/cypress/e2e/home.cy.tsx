describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the home page successfully', () => {
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should render the canvas container', () => {
    cy.get('div')
      .should('have.class', 'flex')
      .and('have.class', 'h-screen')
      .and('have.class', 'w-full')
      .and('have.class', 'bg-zinc-900');
  });

  it('should render the 3D canvas element', () => {
    cy.get('canvas').should('exist').and('be.visible');
  });

  it('should have the correct viewport dimensions', () => {
    cy.get('canvas').then(($canvas) => {
      expect($canvas.width()).to.be.greaterThan(0);
      expect($canvas.height()).to.be.greaterThan(0);
    });
  });

  // https://github.com/NyaliaLui/dg-proto/issues/57
  it.skip('should render WebGL context', () => {
    cy.get('canvas').then(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      expect(gl).to.not.be.null;
    });
  });

  it('should have a canvas that fills the screen', () => {
    cy.viewport(1280, 720);
    cy.get('div.flex.h-screen.w-full').then(($container) => {
      const container = $container[0];
      expect(container.clientHeight).to.be.greaterThan(700);
      expect(container.clientWidth).to.be.greaterThan(1200);
    });
  });

  it('should handle different viewport sizes', () => {
    const viewports: [number, number][] = [
      [1920, 1080],
      [1024, 768],
      [375, 667],
    ];

    viewports.forEach(([width, height]) => {
      cy.viewport(width, height);
      cy.get('canvas').should('exist').and('be.visible');
    });
  });
});
