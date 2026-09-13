/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Tipos permitidos
    'type-enum': [
      2, // error
      'always',
      [
        'feat',     // nova funcionalidade
        'fix',      // correção de bug
        'docs',     // apenas documentação
        'style',    // formatação, sem mudança de lógica
        'refactor', // refatoração sem feat/fix
        'test',     // adição ou correção de testes
        'chore',    // tarefas de build/manutenção
        'perf',     // melhoria de performance
        'ci',       // mudanças em CI/CD
        'build',    // sistema de build, dependências
        'revert',   // reverte um commit anterior
      ],
    ],

    // Tipo obrigatório e em minúsculas
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // Escopo opcional mas, se presente, deve ser em minúsculas
    'scope-case': [2, 'always', 'lower-case'],

    // Descrição: obrigatória, sem letra maiúscula no início, sem ponto final
    'subject-empty': [2, 'never'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'subject-min-length': [2, 'always', 10],
    'subject-max-length': [2, 'always', 72],

    // Corpo (body): linha máxima de 100 caracteres
    'body-max-line-length': [1, 'always', 100], // warning

    // Footer: linha máxima de 100 caracteres
    'footer-max-line-length': [1, 'always', 100], // warning
  },

  // Exemplos exibidos quando o commit falha na validação
  helpUrl:
    'https://www.conventionalcommits.org/pt-br/v1.0.0/',
};
