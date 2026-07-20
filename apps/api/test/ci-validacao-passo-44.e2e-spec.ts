/**
 * TEMPORÁRIO — validação real de que o pipeline CI/CD bloqueia deploy
 * quando um teste falha (Passo 44). Removido no commit seguinte, imediatamente
 * após a confirmação.
 */
describe('Validação CI/CD — Passo 44', () => {
  it('teste deliberadamente falhado, para provar que o portão bloqueia o deploy', () => {
    expect(1).toBe(2);
  });
});
