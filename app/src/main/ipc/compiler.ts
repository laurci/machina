import { InMemoryFileSystemHost, Project, ts } from "ts-morph";

export async function compile(code: string): Promise<string> {
  const fs = new InMemoryFileSystemHost();
  fs.writeFileSync("/tmp/index.ts", code);
  const project = new Project({
    fileSystem: fs,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS,
    },
  });

  const sourceFile = project.addSourceFileAtPath("/tmp/index.ts");

  sourceFile.transform((t) => {
    const node = t.visitChildren();

    if (ts.isLabeledStatement(node) && ts.isSourceFile(node.parent)) {
      const line = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
      const label = node.label.getText();
      const name = `exec_${label}_${line.line}`;

      const body = ts.isBlock(node.statement)
        ? node.statement
        : ts.factory.createBlock([node.statement]);
      return t.factory.createFunctionDeclaration(
        [
          t.factory.createModifier(ts.SyntaxKind.ExportKeyword),
          t.factory.createModifier(ts.SyntaxKind.AsyncKeyword),
        ],
        undefined,
        name,
        undefined,
        [],
        undefined,
        body
      );
    }

    return node;
  });

  console.log(sourceFile.getText());
  project.saveSync();

  const diags = project.getPreEmitDiagnostics();
  if (diags.length > 0 && diags.some((d) => d.getCategory() === ts.DiagnosticCategory.Error)) {
    let errors: string[] = [];
    for (const diag of diags) {
      const text = ts.formatDiagnostic(diag.compilerObject, {
        getNewLine: () => "<br />",
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: () => "/tmp",
      });
    }

    throw new Error(errors.join("\n"));
  }

  const result = project.emitSync();

  if (result.getEmitSkipped()) {
    throw new Error("emit skipped");
  }

  const compiled = fs.readFileSync("/tmp/index.js", "utf8");
  const wrapped = `(() => {
      ${compiled}
    })();`;

  return wrapped;
}
