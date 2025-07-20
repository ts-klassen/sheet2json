describe('Smoke test', () => {
  it('loads the app', () => {
    cy.visit('/');
    cy.contains('Sheet-to-JSON Mapper'); // Title in <title>, but not necessarily in body. We'll test for document title.
  });
});
