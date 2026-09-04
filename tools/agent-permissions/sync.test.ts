/**
 * テストの目的（大項目）
 * 1. 権限ポリシーの正本（docs/agent_permissions.md）に書いたコマンドが、
 *    3 つの写し（Claude Code / Copilot / Codex）すべてに同じ判定で書かれていること
 * 2. Copilot の設定ファイルが、正規表現の書き間違いで壊れていないこと
 *
 * 対応表の実体は同じフォルダの policy.json。正本の表を 1 行足したら policy.json にも 1 件足す。
 * 背景と運用は docs/agent_permissions.md の「4 ファイルのずれを検出する」を参照。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import policy from "./policy.json";

// 判定は 3 段階。正本の表の区分に対応する。
type Decision = "allow" | "ask" | "deny";

// policy.json の 1 件分。各ツールの設定ファイルに書かれているべき文字列を持つ。
type Entry = {
  id: string;
  decision: Decision;
  policy: string;
  claude: string;
  vscode: string;
  codex: string;
};

const entries = policy.entries as Entry[];

// リポジトリのルート。このファイルは tools/agent-permissions/ にあるので 2 階層上がる。
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

// リポジトリルートからの相対パスでファイルを読む。
function readRepoFile(relativePath: string): string {
  return readFileSync(repoRoot + relativePath, "utf8");
}

/**
 * JSON に付けた `//` 形式のコメントを取り除く。
 * VS Code の設定ファイルはコメントを書けるが、素の JSON.parse は受け付けないため。
 * 文字列の中にある `//`（URL など）を消さないよう、引用符の内側かどうかを見ながら 1 文字ずつ処理する。
 */
function stripJsonComments(source: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    // 行コメントは行末まで読み飛ばす。改行そのものは残して行番号を保つ。
    if (char === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") {
        i += 1;
      }
      result += "\n";
      continue;
    }

    result += char;
  }

  return result;
}

/**
 * Codex のルールファイルから prefix_rule(...) を 1 件ずつ切り出す。
 * 括弧が入れ子になっていて正規表現では正しく区切れないため、開き括弧と閉じ括弧を数えて範囲を決める。
 * 比較しやすいよう、コメント行を落として空白をすべて取り除いた形で返す。
 */
function readCodexRules(): { decision: string; body: string }[] {
  const withoutComments = readRepoFile(".codex/rules/project.rules")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");

  const rules: { decision: string; body: string }[] = [];
  const keyword = "prefix_rule(";
  let cursor = withoutComments.indexOf(keyword);

  while (cursor !== -1) {
    let depth = 0;
    let end = cursor + keyword.length - 1;

    for (let i = cursor + keyword.length - 1; i < withoutComments.length; i += 1) {
      if (withoutComments[i] === "(") depth += 1;
      if (withoutComments[i] === ")") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    const body = withoutComments.slice(cursor, end + 1).replace(/\s/g, "");
    const decision = /decision="([a-z]+)"/.exec(body)?.[1] ?? "";
    rules.push({ decision, body });

    cursor = withoutComments.indexOf(keyword, end + 1);
  }

  return rules;
}

const policyDocument = readRepoFile("docs/agent_permissions.md");

const claudePermissions = JSON.parse(readRepoFile(".claude/settings.json")).permissions as Record<
  Decision,
  string[]
>;

const vscodeAutoApprove = JSON.parse(stripJsonComments(readRepoFile(".vscode/settings.json")))[
  "chat.tools.terminal.autoApprove"
] as Record<string, boolean>;

const codexRules = readCodexRules();

// Codex は「確認」を prompt、「禁止」を forbidden と呼ぶ。正本の区分から読み替える。
const codexDecisionOf: Record<Decision, string> = {
  allow: "allow",
  ask: "prompt",
  deny: "forbidden",
};

describe("エージェント権限ポリシーの同期", () => {
  describe("正本 docs/agent_permissions.md", () => {
    it.each(entries)("$id が表に載っている", (entry) => {
      expect(policyDocument).toContain(entry.policy);
    });
  });

  describe("写し .claude/settings.json", () => {
    it.each(entries)("$id が $decision に入っている", (entry) => {
      expect(claudePermissions[entry.decision]).toContain(entry.claude);
    });
  });

  describe("写し .vscode/settings.json", () => {
    // Copilot は true / false の 2 値しか持たないため、「確認」と「禁止」はどちらも false になる。
    it.each(entries)("$id が $decision に対応する値になっている", (entry) => {
      expect(Object.keys(vscodeAutoApprove)).toContain(entry.vscode);
      expect(vscodeAutoApprove[entry.vscode]).toBe(entry.decision === "allow");
    });
  });

  describe("写し .codex/rules/project.rules", () => {
    it.each(entries)("$id が $decision に対応するルールになっている", (entry) => {
      const matched = codexRules.filter(
        (rule) =>
          rule.decision === codexDecisionOf[entry.decision] && rule.body.includes(entry.codex),
      );
      expect(matched.length).toBeGreaterThan(0);
    });
  });
});

describe(".vscode/settings.json の書式", () => {
  describe("正規表現を JSON 文字列として書くとき", () => {
    it("すべてのキーが正規表現として組み立てられる", () => {
      for (const key of Object.keys(vscodeAutoApprove)) {
        // キーは /.../ の形か、ただの文字列。前者だけ正規表現として検査する。
        if (!key.startsWith("/") || !key.endsWith("/")) continue;
        expect(() => new RegExp(key.slice(1, -1))).not.toThrow();
      }
    });

    it("バックスラッシュの書き忘れによる制御文字が入っていない", () => {
      // 例: 正規表現の「単語の切れ目」を表す \b は、JSON の中では \ を 2 つ重ねて書く。
      //     1 つで書くとバックスペース文字（U+0008）になり、ルールが一致しなくなる。
      // 正規表現で制御文字を書くと検査する側が同じ罠にはまるため、文字コードで判定する。
      for (const key of Object.keys(vscodeAutoApprove)) {
        const controlCharacters = [...key].filter((character) => character.charCodeAt(0) < 0x20);
        expect({ key, controlCharacters }).toEqual({ key, controlCharacters: [] });
      }
    });
  });
});
