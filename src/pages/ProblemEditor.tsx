/**
 * ProblemEditor — Author a new problem  (GDD §3, §9.3)
 * Lets an instructor define a Theory T = (V, F) and a problem instance
 * P = (T, H, C). Before submission, runs validateSolvability() locally
 * (src/game/engine.ts) and previews the optimal deduction path; the
 * server re-validates and persists via POST /api/problems.
 */

import React, { useState } from 'react';
import { createProblem } from '@api/problems';
import type { ProblemDraft, CreateProblemResponse } from '@api/problems';
import type { Domain, Difficulty, Variable, Formula, Problem } from '@game/types';
import { validateSolvability, computeOptimalPath } from '@game/engine';
import { t, tf, domainLabel, difficultyLabel } from '@i18n/strings';
import type { Lang } from '@i18n/strings';
import { LangSwitch } from '@components/GameScreen';

const DOMAINS: readonly Domain[] = ['physics', 'chemistry', 'mathematics', 'biology', 'engineering'];
const DIFFICULTIES: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert'];

interface ProblemEditorProps {
  apiUrl: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface OptimalPathStep {
  formulaId: string;
  expression: string;
  revealedLabel: string;
}

/** Walk the greedy path, describing each step's formula and the variable it reveals. */
function describeOptimalPath(candidate: Problem, path: string[], lang: Lang): OptimalPathStep[] {
  const identified = new Set(candidate.hypotheses);
  const varById = new Map(candidate.variables.map(v => [v.id, v]));
  const formulaById = new Map(candidate.formulas.map(f => [f.id, f]));

  return path.map(formulaId => {
    const formula = formulaById.get(formulaId)!;
    const unknowns = formula.variableIds.filter(v => !identified.has(v));
    const revealedId = unknowns[0]!;
    identified.add(revealedId);

    const variable = varById.get(revealedId);
    const expression = (lang === 'fr' ? formula.expression_fr : undefined) ?? formula.expression;
    const revealedLabel = variable ? (lang === 'fr' ? variable.label_fr : variable.label) : revealedId;

    return { formulaId, expression, revealedLabel };
  });
}

export function ProblemEditor({ apiUrl, lang, onLangChange }: ProblemEditorProps) {
  const [id, setId] = useState('');
  const [domain, setDomain] = useState<Domain>('physics');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [title, setTitle] = useState('');
  const [titleFr, setTitleFr] = useState('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [hypotheses, setHypotheses] = useState<string[]>([]);
  const [conclusions, setConclusions] = useState<string[]>([]);

  const [isTrap, setIsTrap] = useState(false);
  const [missingFields, setMissingFields] = useState(false);
  const [unsolvable, setUnsolvable] = useState(false);
  const [optimalPath, setOptimalPath] = useState<OptimalPathStep[] | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [createdInfo, setCreatedInfo] = useState<CreateProblemResponse | null>(null);

  // ── Variables ──────────────────────────────────────────────────────────
  const addVariable = () => {
    setVariables([...variables, { id: `v${variables.length + 1}`, label: '', label_fr: '', domain }]);
  };
  const updateVariable = (idx: number, patch: Partial<Variable>) => {
    setVariables(variables.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };
  const removeVariable = (idx: number) => {
    const removedId = variables[idx]?.id;
    setVariables(variables.filter((_, i) => i !== idx));
    if (removedId) {
      setFormulas(formulas.map(f => ({ ...f, variableIds: f.variableIds.filter(v => v !== removedId) })));
      setHypotheses(hypotheses.filter(v => v !== removedId));
      setConclusions(conclusions.filter(v => v !== removedId));
    }
  };

  // ── Formulas ───────────────────────────────────────────────────────────
  const addFormula = () => {
    setFormulas([...formulas, { id: `f${formulas.length + 1}`, expression: '', variableIds: [] }]);
  };
  const updateFormula = (idx: number, patch: Partial<Formula>) => {
    setFormulas(formulas.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const removeFormula = (idx: number) => {
    setFormulas(formulas.filter((_, i) => i !== idx));
  };
  const toggleFormulaVariable = (idx: number, varId: string) => {
    setFormulas(formulas.map((f, i) => {
      if (i !== idx) return f;
      const included = f.variableIds.includes(varId);
      return { ...f, variableIds: included ? f.variableIds.filter(v => v !== varId) : [...f.variableIds, varId] };
    }));
  };

  // ── Hypotheses / Conclusions ─────────────────────────────────────────────
  const toggleHypothesis = (varId: string) => {
    setHypotheses(hypotheses.includes(varId) ? hypotheses.filter(v => v !== varId) : [...hypotheses, varId]);
  };
  const toggleConclusion = (varId: string) => {
    setConclusions(conclusions.includes(varId) ? conclusions.filter(v => v !== varId) : [...conclusions, varId]);
  };

  // ── Submission ────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setSubmitStatus('idle');
    setCreatedInfo(null);
    setOptimalPath(null);
    setUnsolvable(false);

    if (
      !id.trim() || !title.trim() || !titleFr.trim() ||
      variables.length === 0 || formulas.length === 0 ||
      hypotheses.length === 0 || conclusions.length === 0
    ) {
      setMissingFields(true);
      return;
    }
    setMissingFields(false);

    const draft: ProblemDraft = {
      id, domain, difficulty, title, title_fr: titleFr, variables, formulas, hypotheses, conclusions, isTrap,
    };
    const candidate: Problem = { ...draft, optimalSteps: 0, solvable: true };

    if (!isTrap) {
      if (!validateSolvability(candidate)) {
        setUnsolvable(true);
        return;
      }
      const path = computeOptimalPath(candidate);
      setOptimalPath(describeOptimalPath(candidate, path, lang));
    } else {
      setOptimalPath([]);
    }

    setSubmitStatus('submitting');
    createProblem(apiUrl, draft)
      .then(res => {
        setSubmitStatus('success');
        setCreatedInfo(res);
      })
      .catch(err => {
        console.error('[problem-editor] failed to create problem', err);
        setSubmitStatus('error');
      });
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#F5F6F8' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#fff',
          borderBottom: '1px solid #D6DCE4',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, color: '#2E2E2E' }}>{t('problemEditorTitle', lang)}</h1>
        <LangSwitch lang={lang} onChange={onLangChange} />
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <Section title={t('problemDetailsSectionTitle', lang)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Field label={t('idLabel', lang)}>
              <input value={id} onChange={e => setId(e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('domainFilterLabel', lang)}>
              <select value={domain} onChange={e => setDomain(e.target.value as Domain)} style={inputStyle}>
                {DOMAINS.map(d => (
                  <option key={d} value={d}>{domainLabel(d, lang)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('difficultyFilterLabel', lang)}>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} style={inputStyle}>
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{difficultyLabel(d, lang)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('problemTitleLabel', lang)}>
              <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
            </Field>
            <Field label={t('problemTitleFrLabel', lang)}>
              <input value={titleFr} onChange={e => setTitleFr(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: '#595959', cursor: 'pointer' }}>
            <input type="checkbox" checked={isTrap} onChange={e => { setIsTrap(e.target.checked); setUnsolvable(false); }} />
            {t('editorIsTrap', lang)}
          </label>
        </Section>

        <Section title={t('panelVariables', lang)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {variables.map((v, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <Field label={t('variableIdLabel', lang)}>
                  <input value={v.id} onChange={e => updateVariable(idx, { id: e.target.value })} style={{ ...inputStyle, width: 70 }} />
                </Field>
                <Field label={t('variableLabelLabel', lang)}>
                  <input value={v.label} onChange={e => updateVariable(idx, { label: e.target.value })} style={inputStyle} />
                </Field>
                <Field label={t('variableLabelFrLabel', lang)}>
                  <input value={v.label_fr} onChange={e => updateVariable(idx, { label_fr: e.target.value })} style={inputStyle} />
                </Field>
                <Field label={t('variableUnitLabel', lang)}>
                  <input value={v.unit ?? ''} onChange={e => updateVariable(idx, { unit: e.target.value })} style={{ ...inputStyle, width: 70 }} />
                </Field>
                <button onClick={() => removeVariable(idx)} style={removeButtonStyle}>{t('removeButton', lang)}</button>
              </div>
            ))}
            <button onClick={addVariable} style={addButtonStyle}>{t('addVariableButton', lang)}</button>
          </div>
        </Section>

        <Section title={t('panelFormulas', lang)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formulas.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #D6DCE4', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <Field label={t('formulaIdLabel', lang)}>
                    <input value={f.id} onChange={e => updateFormula(idx, { id: e.target.value })} style={{ ...inputStyle, width: 70 }} />
                  </Field>
                  <Field label={t('formulaExpressionLabel', lang)}>
                    <input value={f.expression} onChange={e => updateFormula(idx, { expression: e.target.value })} style={inputStyle} />
                  </Field>
                  <Field label={t('formulaExpressionFrLabel', lang)}>
                    <input value={f.expression_fr ?? ''} onChange={e => updateFormula(idx, { expression_fr: e.target.value })} style={inputStyle} />
                  </Field>
                  <button onClick={() => removeFormula(idx)} style={removeButtonStyle}>{t('removeButton', lang)}</button>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>{t('formulaVariablesLabel', lang)}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {variables.map(v => (
                      <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={f.variableIds.includes(v.id)}
                          onChange={() => toggleFormulaVariable(idx, v.id)}
                        />
                        {v.id}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addFormula} style={addButtonStyle}>{t('addFormulaButton', lang)}</button>
          </div>
        </Section>

        <Section title={t('hypothesesSectionTitle', lang)}>
          <VariableCheckboxList variables={variables} selected={hypotheses} onToggle={toggleHypothesis} lang={lang} />
        </Section>

        <Section title={t('conclusionsSectionTitle', lang)}>
          <VariableCheckboxList variables={variables} selected={conclusions} onToggle={toggleConclusion} lang={lang} />
        </Section>

        {missingFields && <ErrorBox>{t('requiredFieldsMsg', lang)}</ErrorBox>}
        {unsolvable && <ErrorBox>{t('unsolvableErrorMsg', lang)}</ErrorBox>}
        {submitStatus === 'error' && <ErrorBox>{t('createProblemErrorMsg', lang)}</ErrorBox>}

        {optimalPath && (
          <Section title={t('optimalPathSectionTitle', lang)}>
            {optimalPath.length === 0 ? (
              <NoData lang={lang} />
            ) : (
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                {optimalPath.map(step => (
                  <li key={step.formulaId}>
                    <strong>{step.formulaId}</strong> ({step.expression}) — {t('deductionReveals', lang)} <strong>{step.revealedLabel}</strong>
                  </li>
                ))}
              </ol>
            )}
            {submitStatus === 'success' && createdInfo && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#70AD47' }}>
                {tf('problemCreatedMsg', lang)(createdInfo.optimalSteps)}
              </div>
            )}
          </Section>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitStatus === 'submitting'}
          style={{
            border: '1px solid #2E75B6',
            background: '#2E75B6',
            color: '#fff',
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 700,
            cursor: submitStatus === 'submitting' ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {t('createProblemButton', lang)}
        </button>
      </main>
    </div>
  );
}

// ── Styling helpers ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: '1px solid #D6DCE4',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 14,
  minWidth: 100,
};

const addButtonStyle: React.CSSProperties = {
  border: '1px dashed #2E75B6',
  background: 'transparent',
  color: '#2E75B6',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-start',
};

const removeButtonStyle: React.CSSProperties = {
  border: '1px solid #C00000',
  background: 'transparent',
  color: '#C00000',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
};

// ── Helper components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #D6DCE4', borderRadius: 10, padding: 16 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#2E2E2E' }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#595959' }}>
      {label}
      {children}
    </label>
  );
}

function NoData({ lang }: { lang: Lang }) {
  return <div style={{ color: '#595959', fontSize: 13 }}>{t('noDataMsg', lang)}</div>;
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '2px solid #C00000',
        background: '#FBEEEE',
        color: '#C00000',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

function VariableCheckboxList({ variables, selected, onToggle, lang }: { variables: Variable[]; selected: string[]; onToggle: (varId: string) => void; lang: Lang }) {
  if (variables.length === 0) return <NoData lang={lang} />;
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {variables.map(v => (
        <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <input type="checkbox" checked={selected.includes(v.id)} onChange={() => onToggle(v.id)} />
          {v.id} — {v.label}
        </label>
      ))}
    </div>
  );
}
