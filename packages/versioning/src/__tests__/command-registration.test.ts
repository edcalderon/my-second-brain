import { Command } from 'commander';
import extension from '../extensions/reentry-status/index';

describe('Property 8: Command Registration and Execution (shape)', () => {
  test('register adds reentry and roadmap commands', async () => {
    const program = new Command();
    await extension.register(program, {});

    const top = program.commands.map((c) => c.name());
    expect(top).toContain('reentry');
    expect(top).toContain('roadmap');

    const reentry = program.commands.find((c) => c.name() === 'reentry');
    expect(reentry?.commands.map((c) => c.name())).toEqual(expect.arrayContaining(['init', 'set', 'sync']));

    const roadmap = program.commands.find((c) => c.name() === 'roadmap');
    expect(roadmap?.commands.map((c) => c.name())).toEqual(
      expect.arrayContaining(['init', 'list', 'set-milestone', 'add'])
    );
  });
});
