import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, AlertTriangle, Plus, Trash2 } from 'lucide-react';

const decisionOSTool = () => {
  const [expandedEpic, setExpandedEpic] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [epics, setEpics] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleSection = (epicId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [epicId + '-' + section]: !prev[epicId + '-' + section]
    }));
  };

  // New epic template
  const createNewEpic = () => ({
    id: Date.now(),
    name: "",
    description: "",
    lifecycle: "BUILD",
    altitude: "EFFICIENCY",
    lifecycleContext: "",
    
    spotTest1: {
      value: { score: 5, rationale: "" },
      usability: { score: 5, rationale: "" },
      feasibility: { score: 5, rationale: "" },
      business: { score: 5, rationale: "" },
      passed: true
    },
    
    spotTest0: {
      impact: "HIGH",
      effort: "LOW"
    },
    
    financial: {
      fixedCosts: 100000,
      variableCosts: 20000,
      totalInvestment: 120000,
      yearlyRevenue: [0, 100000, 150000, 200000, 250000],
      yearlyOpex: [0, 30000, 35000, 40000, 45000],
      discountRate: 0.10
    },
    
    ndr: {
      upar: { score: 5, name: "User Pain, Alternatives, Relevance", rationale: "" },
      map: { score: 5, name: "Market Activation Potential", rationale: "" },
      cev: { score: 5, name: "Core Experience Value", rationale: "" },
      star: { score: 5, name: "Scalability, Transferability, Adjacent, Reuse", rationale: "" },
      ai: { score: 5, name: "AI Enhancement Potential", rationale: "" },
      vcrm: { score: 5, name: "Value × Confidence × (1-Risk) × Money", rationale: "", calculation: "" },
      layer: { score: 5, name: "Legal, Alignment, Yield, Explainability, Risk", rationale: "" }
    },
    
    sensitivity: "What assumptions could change this score? (e.g., 'If LAYER drops below 6, decision flips to HOLD')"
  });

  const [newEpic, setNewEpic] = useState(createNewEpic());

  const calculateNDR = (ndr) => {
    const benefitScore = (ndr.upar.score + ndr.map.score + ndr.cev.score + ndr.star.score + ndr.ai.score) / 5;
    const financialScore = ndr.vcrm.score;
    const feasMult = 0.5 + 0.5 * (ndr.layer.score / 10);
    const ndrScore = (0.5 * benefitScore + 0.5 * financialScore) * feasMult;
    return { benefitScore, financialScore, feasMult, ndrScore };
  };

  const calculateNPV = (financial) => {
    const { totalInvestment, yearlyRevenue, yearlyOpex, discountRate } = financial;
    let npv = -totalInvestment;
    for (let year = 1; year <= 5; year++) {
      const revenue = yearlyRevenue[year] || 0;
      const opex = yearlyOpex[year] || 0;
      const netCashFlow = revenue - opex;
      const discountedFlow = netCashFlow / Math.pow(1 + discountRate, year);
      npv += discountedFlow;
    }
    return npv;
  };

  const calculateVUFB = (spotTest1) => {
    const scores = [spotTest1.value.score, spotTest1.usability.score, spotTest1.feasibility.score, spotTest1.business.score];
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const getLifecycleDecision = (epic, ndrScore, npv) => {
    const { lifecycle, ndr, spotTest1 } = epic;
    const layerScore = ndr.layer.score;
    const vufbScore = calculateVUFB(spotTest1);
    
    if (vufbScore < 5.0) {
      return { text: "HOLD/KILL", color: "text-red-400", reason: "Failed VUFB hard stop filter", gated: true };
    }
    
    if (lifecycle === "BUILD") {
      if (layerScore < 7.0) {
        return { text: "HOLD/KILL", color: "text-red-400", reason: `BUILD phase requires LAYER ≥ 7.0 (current: ${layerScore.toFixed(1)}). Execution feasibility too risky.`, gated: true };
      }
      if (ndrScore >= 8.0) {
        return { text: "BUILD IMMEDIATELY", color: "text-green-400", reason: `High NDR (${ndrScore.toFixed(2)}) + strong LAYER (${layerScore.toFixed(1)}) justifies BUILD investment.`, gated: false };
      }
      if (ndrScore >= 5.0) {
        return { text: "PROTOTYPE", color: "text-yellow-400", reason: "Moderate NDR for BUILD phase. Start with pilot to validate assumptions.", gated: false };
      }
      return { text: "HOLD/KILL", color: "text-red-400", reason: `NDR too low (${ndrScore.toFixed(2)}) for BUILD risk profile.`, gated: false };
    }
    
    if (lifecycle === "DEFEND") {
      if (ndrScore < 8.0) {
        return { text: "HOLD/KILL", color: "text-red-400", reason: `DEFEND epics require NDR ≥ 8.0 (current: ${ndrScore.toFixed(2)}).`, gated: true };
      }
      if (npv < 0) {
        return { text: "HOLD/KILL", color: "text-red-400", reason: `DEFEND epics require positive NPV (current: ${(npv/1000).toFixed(0)}K).`, gated: true };
      }
      return { text: "BUILD IMMEDIATELY", color: "text-green-400", reason: "DEFEND criteria met: NDR ≥ 8.0 + positive NPV.", gated: false };
    }
    
    if (ndrScore >= 8.0) {
      return { text: "BUILD IMMEDIATELY", color: "text-green-400", reason: "High-confidence investment for growth phase.", gated: false };
    }
    if (ndrScore >= 5.0) {
      return { text: "PROTOTYPE", color: "text-yellow-400", reason: "Phase-dependent rollout recommended.", gated: false };
    }
    return { text: "HOLD/KILL", color: "text-red-400", reason: "Improve Fit/Feasibility before scaling.", gated: false };
  };

  const rankedEpics = epics.map(epic => {
    const ndrCalc = calculateNDR(epic.ndr);
    const npv = calculateNPV(epic.financial);
    const decision = getLifecycleDecision(epic, ndrCalc.ndrScore, npv);
    const vufbScore = calculateVUFB(epic.spotTest1);
    
    const benefitContribution = (0.5 * ndrCalc.benefitScore) * ndrCalc.feasMult;
    const financeContribution = (0.5 * ndrCalc.financialScore) * ndrCalc.feasMult;
    const benefitPercent = ndrCalc.ndrScore > 0 ? (benefitContribution / ndrCalc.ndrScore) * 100 : 50;
    const financePercent = ndrCalc.ndrScore > 0 ? (financeContribution / ndrCalc.ndrScore) * 100 : 50;
    
    return { ...epic, npv, vufbScore, ...ndrCalc, decision, benefitPercent, financePercent };
  }).sort((a, b) => {
    if (a.decision.gated && !b.decision.gated) return 1;
    if (!a.decision.gated && b.decision.gated) return -1;
    return b.ndrScore - a.ndrScore;
  });

  const addEpic = () => {
    if (newEpic.name.trim()) {
      const epicToAdd = {
        ...newEpic,
        id: Date.now(),
        financial: {
          ...newEpic.financial,
          totalInvestment: newEpic.financial.fixedCosts + newEpic.financial.variableCosts
        },
        lifecycleContext: `${newEpic.lifecycle} + ${newEpic.altitude} → Strategic positioning for this phase`,
        spotTest1: {
          ...newEpic.spotTest1,
          passed: calculateVUFB(newEpic.spotTest1) >= 5.0
        }
      };
      setEpics([...epics, epicToAdd]);
      setNewEpic(createNewEpic());
      setShowAddForm(false);
    }
  };

  const removeEpic = (id) => {
    setEpics(epics.filter(e => e.id !== id));
  };

  const updateNewEpic = (path, value) => {
    setNewEpic(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const StatusIcon = ({ decision }) => {
    if (decision.text === 'BUILD IMMEDIATELY') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (decision.text === 'PROTOTYPE') return <div className="w-5 h-5 flex items-center justify-center text-yellow-500 font-bold">–</div>;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return "$0";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const getPriorityBorderColor = (decision) => {
    if (decision.text === 'BUILD IMMEDIATELY') return 'border-green-500';
    if (decision.text === 'PROTOTYPE') return 'border-yellow-500';
    return 'border-red-500';
  };

  const ScoreSlider = ({ label, value, onChange, min = 1, max = 10, step = 0.5 }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-20">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <span className="text-sm font-bold text-blue-400 w-8">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            decisionOSTool
          </h1>
          <p className="text-gray-400">
            Funnel: Grid Placement (auto-kill invalid cells) → 2x2 Leverage → VUFB Fit → Full Analysis → Stack Rank
          </p>
        </div>

        {/* STAGE 0: Strategic Grid - First Gate */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 relative">
          <div className="absolute top-2 right-3 text-xs text-gray-600 font-light tracking-wide">Joseph Mar ™</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            <span className="text-blue-400 mr-2">0.</span>Strategic Grid Placement
          </h2>
          <p className="text-sm text-gray-400 mb-2">
            <strong className="text-yellow-400">FIRST GATE:</strong> Place your work item in the grid. If the cell has no colored dots, it's an <strong className="text-red-400">AUTO-KILL</strong> — wrong phase for that work type.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Lifecycle phases (horizontal) × Competitive altitude (vertical). Colored dots = valid work types for that cell. No dots = don't even start.
          </p>
          
          <div className="relative bg-gray-900 rounded-lg p-4" style={{ minHeight: '700px' }}>
            {/* Grid structure */}
            <div className="grid grid-cols-4 gap-2" style={{ gridTemplateRows: 'auto repeat(4, 1fr)' }}>
              {/* Header row */}
              <div></div>
              <div className="text-center p-3 bg-orange-900 bg-opacity-30 rounded">
                <div className="font-bold text-orange-400 text-lg">BUILD (0→1)</div>
                <div className="text-xs text-yellow-300 font-bold mt-2 p-2 bg-yellow-900 bg-opacity-40 rounded">
                  GATE: LAYER ≥ 7.0<br/>
                  NDR ≥8.0: BUILD<br/>
                  NDR 5.0-7.9: PROTOTYPE<br/>
                  NDR &lt;5.0: HOLD/KILL
                </div>
              </div>
              <div className="text-center p-3 bg-green-900 bg-opacity-30 rounded">
                <div className="font-bold text-green-400 text-lg">GROW (1→N)</div>
                <div className="text-xs text-yellow-300 font-bold mt-2 p-2 bg-yellow-900 bg-opacity-40 rounded">
                  NDR ≥8.0: BUILD<br/>
                  NDR 5.0-7.9: PROTOTYPE<br/>
                  NDR &lt;5.0: HOLD/KILL
                </div>
              </div>
              <div className="text-center p-3 bg-blue-900 bg-opacity-30 rounded">
                <div className="font-bold text-blue-400 text-lg">DEFEND (N→∞)</div>
                <div className="text-xs text-yellow-300 font-bold mt-2 p-2 bg-yellow-900 bg-opacity-40 rounded">
                  GATE: NDR ≥8.0<br/>
                  AND NPV &gt; 0<br/>
                  (High confidence<br/>+ positive return)
                </div>
              </div>

              {/* FRONTIER row */}
              <div className="flex items-center justify-center p-3 bg-purple-900 bg-opacity-30 rounded">
                <div className="text-center">
                  <div className="font-bold text-purple-400">FRONTIER</div>
                  <div className="text-xs text-gray-400 mt-1">(System Value Creation)</div>
                  <div className="text-xs text-gray-400">"Redefine curves later"</div>
                </div>
              </div>
              <div className="p-3 bg-gray-800 bg-opacity-50 rounded border border-gray-700 relative min-h-32">
                <div className="text-xs text-gray-500">
                  <div>× Too early; PMF first</div>
                  <div className="mt-1 text-yellow-600 text-xs italic">Exception: frontier-native cos (AI, bio, robotics) where PMF = frontier</div>
                </div>
              </div>
              <div className="p-3 bg-yellow-900 bg-opacity-20 rounded border-2 border-yellow-600 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-yellow-400 font-semibold mb-1">⚠️ GATED</div>
                <div className="text-xs text-gray-400">
                  <div>Feedback→Finance</div>
                  <div>• Only if frontier shifts threaten core</div>
                  <div>• Or surplus margin for moonshots</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Feedback→Finance</div>
                  <div>• AI pricing, LTV loops</div>
                  <div>• Margin reinvestment</div>
                  <div className="text-green-400">(Redefine BOTH curves)</div>
                </div>
              </div>

              {/* EXPANSION row */}
              <div className="flex items-center justify-center p-3 bg-blue-900 bg-opacity-30 rounded">
                <div className="text-center">
                  <div className="font-bold text-blue-400">EXPANSION</div>
                  <div className="text-xs text-gray-400 mt-1">(Learn/Monetize)</div>
                  <div className="text-xs text-gray-400">"Shift demand curve"</div>
                </div>
              </div>
              <div className="p-3 bg-gray-800 bg-opacity-50 rounded border border-gray-700 relative min-h-32">
                <div className="text-xs text-gray-500">
                  <div>× No Expansion pre-PMF</div>
                  <div>• Hypothesize only</div>
                  <div>• Can't monetize what isn't validated</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Fit→Feedback→Finance</div>
                  <div>• Segmented/elastic pricing</div>
                  <div>• Monetization expansion</div>
                  <div>• Experiment cadence</div>
                  <div className="text-green-400">(Early learning loops)</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Feedback→Finance</div>
                  <div>• Global pricing, loyalty</div>
                  <div>• Churn reduction, upsell</div>
                  <div className="text-green-400">(Shift demand curve)</div>
                </div>
              </div>

              {/* DIFFERENTIATION row */}
              <div className="flex items-center justify-center p-3 bg-green-900 bg-opacity-30 rounded">
                <div className="text-center">
                  <div className="font-bold text-green-400">DIFFEREN-TIATION</div>
                  <div className="text-xs text-gray-400 mt-1">(User/UX)</div>
                  <div className="text-xs text-gray-400">"Climb demand curve"</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Fric→Feas→Fit+Flow</div>
                  <div>• MVP scoping</div>
                  <div>• Core pain interviews</div>
                  <div className="text-green-400">(WTP tests & pricing hypotheses)</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Feas→Fit→Flow</div>
                  <div>• Persona messaging/UX</div>
                  <div>• Feature tiering, WTP</div>
                  <div className="text-green-400">(Climb demand curve)</div>
                </div>
              </div>
              <div className="p-3 bg-yellow-900 bg-opacity-20 rounded border-2 border-yellow-600 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-yellow-400 font-semibold mb-1">⚠️ GATED</div>
                <div className="text-xs text-gray-400">
                  <div>Fit→Flow (maintenance)</div>
                  <div>• Only when data shows erosion</div>
                  <div>• Churn/NPS/funnel signals</div>
                </div>
              </div>

              {/* EFFICIENCY row */}
              <div className="flex items-center justify-center p-3 bg-yellow-900 bg-opacity-30 rounded">
                <div className="text-center">
                  <div className="font-bold text-yellow-400">EFFICIENCY</div>
                  <div className="text-xs text-gray-400 mt-1">(Cost/Speed)</div>
                  <div className="text-xs text-gray-400">"Flatten cost curve"</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Fric→Feasibility</div>
                  <div>• Remove blockers</div>
                  <div>• Cost floors (pricing)</div>
                  <div className="text-green-400">(Validate feasibility)</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Feasibility scaling</div>
                  <div>• Reliability/SLA</div>
                  <div>• Predictable throughput</div>
                  <div className="text-green-400">(Scalability curves)</div>
                </div>
              </div>
              <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-700 relative min-h-32">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
                </div>
                <div className="text-xs text-gray-300">
                  <div>Feas→FinanceOps</div>
                  <div>• Margin ops, modernization</div>
                  <div>• Efficiency flywheels</div>
                  <div className="text-green-400">(Flatten cost curve)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 p-4 bg-gray-900 rounded-lg">
            {/* Quick Reference - Horizontal */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-3 border-b border-gray-700">
              <div className="text-xs text-gray-400 font-semibold">QUICK REF:</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-orange-400 rounded-full border border-white"></div>
                <span className="text-orange-400">Friction</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                <span className="text-yellow-600">Feasibility</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                <span className="text-green-400">Fit</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
                <span className="text-yellow-400">Flow</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-blue-400 rounded-full border border-white"></div>
                <span className="text-blue-400">Feedback</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
                <span className="text-purple-500">Finance</span>
              </div>
              <div className="border-l border-gray-600 pl-4 flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-4 h-4 bg-green-900 bg-opacity-40 rounded border border-green-700"></div>
                  <span className="text-green-400">Open</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-4 h-4 bg-yellow-900 bg-opacity-30 rounded border-2 border-yellow-600"></div>
                  <span className="text-yellow-400">Gated</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-4 h-4 bg-gray-800 rounded border border-gray-600"></div>
                  <span className="text-gray-500">Locked</span>
                </div>
              </div>
            </div>

            {/* Detailed Definitions - Horizontal Grid */}
            <div className="pt-3">
              <div className="text-xs text-gray-400 font-semibold mb-2">SCORING COMPONENTS:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span className="text-orange-400 font-semibold">UPAR</span>
                  </div>
                  <div className="text-gray-500 leading-tight space-y-0.5">
                    <div><strong>U</strong>ser Pain <span className="text-gray-600">– "68% abandon carts"</span></div>
                    <div><strong>A</strong>lternatives <span className="text-gray-600">– "No workarounds"</span></div>
                    <div><strong>R</strong>elevance <span className="text-gray-600">– "Core to funnel"</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                    <span className="text-yellow-600 font-semibold">LAYER</span>
                  </div>
                  <div className="text-gray-500 leading-tight space-y-0.5">
                    <div><strong>L</strong>egal <span className="text-gray-600">– "GDPR ok?"</span></div>
                    <div><strong>A</strong>lignment <span className="text-gray-600">– "Fits strategy?"</span></div>
                    <div><strong>Y</strong>ield <span className="text-gray-600">– "ROI worth it?"</span></div>
                    <div><strong>E</strong>xplain <span className="text-gray-600">– "Defensible?"</span></div>
                    <div><strong>R</strong>isk <span className="text-gray-600">– "Downside?"</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 font-semibold">MAP</span>
                  </div>
                  <div className="text-gray-500 leading-tight space-y-0.5">
                    <div><strong>M</strong>arket <span className="text-gray-600">– "TAM big enough?"</span></div>
                    <div><strong>A</strong>ctivation <span className="text-gray-600">– "Path to value?"</span></div>
                    <div><strong>P</strong>otential <span className="text-gray-600">– "Freq × reach?"</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-400 font-semibold">CEV</span>
                  </div>
                  <div className="text-gray-500 leading-tight space-y-0.5">
                    <div><strong>C</strong>ore <span className="text-gray-600">– "Main journey?"</span></div>
                    <div><strong>E</strong>xperience <span className="text-gray-600">– "NPS impact?"</span></div>
                    <div><strong>V</strong>alue <span className="text-gray-600">– "Faster TTV?"</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-400 font-semibold">STAR</span>
                  </div>
                  <div className="text-gray-500 leading-tight space-y-0.5">
                    <div><strong>S</strong>calability <span className="text-gray-600">– "10× ready?"</span></div>
                    <div><strong>T</strong>ransfer <span className="text-gray-600">– "Other products?"</span></div>
                    <div><strong>A</strong>djacent <span className="text-gray-600">– "Unlocks more?"</span></div>
                    <div><strong>R</strong>euse <span className="text-gray-600">– "Recyclable?"</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-500 font-semibold">VCRM</span>
                  </div>
                  <div className="text-gray-500 leading-tight space-y-0.5">
                    <div><strong>V</strong>alue <span className="text-gray-600">– "$impact 1-10"</span></div>
                    <div><strong>C</strong>onfidence <span className="text-gray-600">– "Sure? 1-10"</span></div>
                    <div><strong>R</strong>isk <span className="text-gray-600">– "Fail % 0-1"</span></div>
                    <div><strong>M</strong>oney <span className="text-gray-600">– "NPV positive?"</span></div>
                  </div>
                </div>
              </div>
              
              {/* Scoring Anchors - Minimalist */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500 font-semibold">ANCHORS:</span>
                  <span><span className="text-green-400 font-bold">9-10</span> <span className="text-gray-600">critical/no workaround</span></span>
                  <span><span className="text-green-300 font-bold">7-8</span> <span className="text-gray-600">significant</span></span>
                  <span><span className="text-yellow-400 font-bold">5-6</span> <span className="text-gray-600">moderate</span></span>
                  <span><span className="text-orange-400 font-bold">3-4</span> <span className="text-gray-600">minor</span></span>
                  <span><span className="text-red-400 font-bold">1-2</span> <span className="text-gray-600">nice-to-have</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            <strong className="text-white">How to use:</strong> (1) Pick your lifecycle phase. (2) Pick your altitude. (3) Check the cell:
            <span className="text-green-400"> Dots = proceed to Stage 1.</span>
            <span className="text-yellow-400"> ⚠️ Gated = proceed only if gate conditions met.</span>
            <span className="text-red-400"> × No dots = AUTO-KILL.</span>
          </div>
        </div>

        {/* STAGE 1: 2x2 Leverage Check */}
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-6 mb-8 relative">
          <div className="absolute top-2 right-3 text-xs text-purple-400 font-light tracking-wide opacity-50">Joseph Mar ™</div>
          <h2 className="text-2xl font-bold text-white mb-3">
            <span className="text-yellow-400 mr-2">1.</span>🎯 Spot Test 0: Effort/Impact 2x2
          </h2>
          <p className="text-gray-300 text-sm mb-4">Quick 2-minute leverage check. Is it big enough and fast enough to be worth analyzing? Kills 40-50% of ideas.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 bg-opacity-50 rounded p-4">
              <div className="text-blue-400 font-semibold mb-2">⏱️ Time: 2 minutes</div>
              <p className="text-xs text-gray-300">Quick gut check on impact vs. effort trade-off</p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 rounded p-4">
              <div className="text-green-400 font-semibold mb-2">🎯 Purpose: Leverage filter</div>
              <p className="text-xs text-gray-300">Kill low-leverage ideas immediately</p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 rounded p-4">
              <div className="text-yellow-400 font-semibold mb-2">📊 Kills: 40-50% of ideas</div>
              <p className="text-xs text-gray-300">Before wasting time on full NDR</p>
            </div>
          </div>

          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6">
            <div className="flex">
              <div className="flex flex-col justify-center items-center mr-4 -ml-2">
                <span className="text-xs font-semibold text-gray-400 transform -rotate-90 whitespace-nowrap">IMPACT</span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className="text-xs text-gray-500 w-12 text-right mr-2">High</span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-green-900 to-green-800 border-2 border-green-500 rounded-lg p-4">
                      <div className="text-lg font-bold text-green-100 mb-2">🟢 Quick Wins</div>
                      <div className="text-xs text-green-200 mb-2">High Impact • Low Effort</div>
                      <div className="text-xs text-green-100 mb-3">Fast-track these! High value with minimal effort.</div>
                      <div className="text-xs font-semibold text-green-200">Example: Add Google SSO</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 border-2 border-yellow-500 rounded-lg p-4">
                      <div className="text-lg font-bold text-yellow-100 mb-2">🟡 Strategic Bets</div>
                      <div className="text-xs text-yellow-200 mb-2">High Impact • High Effort</div>
                      <div className="text-xs text-yellow-100 mb-3">Major initiatives requiring serious commitment. Evaluate carefully.</div>
                      <div className="text-xs font-semibold text-yellow-200">Example: Enterprise tier launch</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center mt-3">
                  <span className="text-xs text-gray-500 w-12 text-right mr-2">Low</span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 border-2 border-gray-500 rounded-lg p-4">
                      <div className="text-lg font-bold text-gray-200 mb-2">⚪ Distractions</div>
                      <div className="text-xs text-gray-300 mb-2">Low Impact • Low Effort</div>
                      <div className="text-xs text-gray-300 mb-3">Feels easy but adds no real value. Skip it.</div>
                      <div className="text-xs font-semibold text-gray-400">Example: Add dark mode</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-900 to-red-800 border-2 border-red-500 rounded-lg p-4">
                      <div className="text-lg font-bold text-red-100 mb-2">🔴 Avoid</div>
                      <div className="text-xs text-red-200 mb-2">Low Impact • High Effort</div>
                      <div className="text-xs text-red-100 mb-3">Kill immediately. Don't waste time on full analysis.</div>
                      <div className="text-xs font-semibold text-red-200">Example: Complete rewrite</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center mt-2">
                  <span className="w-12 mr-2"></span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="text-center text-xs text-gray-500">Low Effort</div>
                    <div className="text-center text-xs text-gray-500">High Effort</div>
                  </div>
                </div>
                <div className="text-center text-xs font-semibold text-gray-400 mt-1">EFFORT →</div>
              </div>
            </div>

            <div className="mt-4 bg-blue-900 bg-opacity-30 rounded p-3 border border-blue-500">
              <div className="text-sm font-semibold text-blue-300 mb-2">📋 Decision Flow:</div>
              <div className="text-xs text-blue-200 space-y-1">
                <div>🔴 <strong>Low Impact + High Effort</strong> → KILL (don't proceed to VUFB)</div>
                <div>🟢 <strong>High Impact + Low Effort</strong> → FAST TRACK (expect high scores)</div>
                <div>🟡 <strong>High Impact + High Effort</strong> → EVALUATE (proceed to Stage 2)</div>
                <div>⚪ <strong>Low Impact + Low Effort</strong> → SKIP (distractions, not worth the context switch)</div>
              </div>
            </div>
          </div>
        </div>

        {/* STAGE 2: VUFB Strategic Fit */}
        <div className="bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg p-6 mb-8 relative">
          <div className="absolute top-2 right-3 text-xs text-yellow-400 font-light tracking-wide opacity-50">Joseph Mar ™</div>
          <h2 className="text-2xl font-bold text-white mb-3">
            <span className="text-green-400 mr-2">2.</span>📋 Spot Test 1: VUFB Quick Check
          </h2>
          <p className="text-gray-300 text-sm mb-4">
            5-10 minute strategic fit evaluation. Are we warm or hot on this idea? Threshold: VUFB ≥ 5.0 to proceed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 bg-opacity-50 rounded p-4">
              <div className="text-yellow-400 font-semibold mb-2">⏱️ Time: 5-10 minutes</div>
              <p className="text-xs text-gray-300">Strategic alignment deep dive</p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 rounded p-4">
              <div className="text-green-400 font-semibold mb-2">🎯 Purpose: Fit filter</div>
              <p className="text-xs text-gray-300">Kill strategically misaligned ideas</p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 rounded p-4">
              <div className="text-red-400 font-semibold mb-2">📊 Kills: 30-40% remaining</div>
              <p className="text-xs text-gray-300">After 2x2 leverage check</p>
            </div>
          </div>

          {/* Show existing epics VUFB scores */}
          {rankedEpics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {rankedEpics.map(epic => (
                <div key={epic.id} className="bg-gray-800 bg-opacity-50 rounded-lg p-5 border-l-4" style={{
                  borderColor: epic.vufbScore >= 5 ? '#10b981' : '#ef4444'
                }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{epic.name}</h3>
                      <div className="text-xs text-gray-400">{epic.lifecycle} / {epic.altitude}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold" style={{
                        color: epic.vufbScore >= 7 ? '#10b981' : epic.vufbScore >= 5 ? '#fbbf24' : '#ef4444'
                      }}>
                        {epic.vufbScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-400">VUFB</div>
                      <div className="mt-1">
                        {epic.vufbScore >= 5 ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-900 text-green-200 font-semibold">✓ PASS</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-red-900 text-red-200 font-semibold">✗ FAIL</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(epic.spotTest1).filter(([key]) => key !== 'passed').map(([key, data]) => (
                      <div key={key} className="bg-gray-900 bg-opacity-50 p-2 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400 capitalize font-semibold">{key}</span>
                          <span className="text-sm font-bold" style={{
                            color: data.score >= 7 ? '#10b981' : data.score >= 5 ? '#fbbf24' : '#ef4444'
                          }}>
                            {data.score}/10
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 bg-blue-900 bg-opacity-30 rounded p-4 border border-blue-500">
            <div className="text-sm font-semibold text-blue-300 mb-2">📋 VUFB Components:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-200">
              <div><strong>Value:</strong> What problem does this solve and for whom?</div>
              <div><strong>Usability:</strong> Is our product intuitive enough for users to find value?</div>
              <div><strong>Feasibility:</strong> Is it commercially viable?</div>
              <div><strong>Business:</strong> Does it align with our strategy?</div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-700 text-xs text-blue-200">
              <strong>Decision Rule:</strong> VUFB &lt; 5.0 → <span className="text-red-300">KILL or DEFER</span> | VUFB ≥ 5.0 → <span className="text-green-300">Proceed to Stage 3 (Full Analysis)</span>
            </div>
          </div>
        </div>

        {/* STAGE 3: Full Analysis - NDR + NPV */}
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 mb-8 relative">
          <div className="absolute top-2 right-3 text-xs text-blue-400 font-light tracking-wide opacity-50">Joseph Mar ™</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            <span className="text-purple-400 mr-2">3.</span>Full Analysis - NDR Score & NPV
          </h2>
          <p className="text-gray-300 text-sm mb-4">
            Deep dive on surviving ideas. Phase-specific gates apply. Final stack rank determines BUILD / PROTOTYPE / HOLD/KILL.
          </p>
          
          {rankedEpics.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {rankedEpics.slice(0, 3).map((epic, idx) => (
                  <div key={epic.id} className="bg-gray-800 bg-opacity-50 rounded p-4">
                    <div className="text-4xl font-bold text-blue-400 mb-2">#{idx + 1}</div>
                    <div className="text-lg font-semibold text-white mb-1">{epic.name}</div>
                    <div className="text-xs text-gray-400 mb-2">{epic.lifecycle} / {epic.altitude}</div>
                    <div className="text-2xl font-bold mb-2" style={{color: epic.decision.text === 'BUILD IMMEDIATELY' ? '#4ade80' : epic.decision.text === 'PROTOTYPE' ? '#fbbf24' : '#f87171'}}>
                      NDR: {epic.ndrScore.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-300">
                      NPV: {formatCurrency(epic.npv)}
                    </div>
                    <div className={"text-xs font-semibold mt-2 " + epic.decision.color}>
                      {epic.decision.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800 bg-opacity-50 rounded p-4 mb-6">
                <h3 className="font-bold text-white mb-3">Lifecycle-Aware Recommendations</h3>
                <div className="space-y-2 text-sm text-gray-200">
                  {rankedEpics.slice(0, 3).map((epic, idx) => (
                    <p key={epic.id}>
                      <strong className={epic.decision.color}>
                        {idx === 0 ? 'PRIORITY 1:' : idx === 1 ? 'PRIORITY 2:' : 'PRIORITY 3:'}
                      </strong> <strong>{epic.name}</strong> ({epic.lifecycle})
                      {' '}- {epic.decision.reason}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Add New Epic Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Epic to Evaluate
            </button>
          )}

          {/* Add Epic Form */}
          {showAddForm && (
            <div className="bg-gray-800 rounded-lg p-6 border-2 border-blue-500">
              <h3 className="text-xl font-bold text-white mb-4">New Epic Evaluation</h3>
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Epic Name *</label>
                  <input
                    type="text"
                    value={newEpic.name}
                    onChange={(e) => updateNewEpic('name', e.target.value)}
                    placeholder="e.g., AI-Powered Search"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Description</label>
                  <input
                    type="text"
                    value={newEpic.description}
                    onChange={(e) => updateNewEpic('description', e.target.value)}
                    placeholder="Brief description"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Grid Placement */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-blue-400 mb-3">Stage 0: Grid Placement</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Lifecycle Phase</label>
                    <select
                      value={newEpic.lifecycle}
                      onChange={(e) => updateNewEpic('lifecycle', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none"
                    >
                      <option value="BUILD">BUILD (0→1)</option>
                      <option value="GROW">GROW (1→N)</option>
                      <option value="DEFEND">DEFEND (N→∞)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Altitude</label>
                    <select
                      value={newEpic.altitude}
                      onChange={(e) => updateNewEpic('altitude', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none"
                    >
                      <option value="EFFICIENCY">EFFICIENCY</option>
                      <option value="DIFFERENTIATION">DIFFERENTIATION</option>
                      <option value="EXPANSION">EXPANSION</option>
                      <option value="FRONTIER">FRONTIER</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2x2 */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-yellow-400 mb-3">Stage 1: Effort/Impact 2x2</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Impact</label>
                    <select
                      value={newEpic.spotTest0.impact}
                      onChange={(e) => updateNewEpic('spotTest0.impact', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none"
                    >
                      <option value="HIGH">HIGH</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Effort</label>
                    <select
                      value={newEpic.spotTest0.effort}
                      onChange={(e) => updateNewEpic('spotTest0.effort', e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none"
                    >
                      <option value="LOW">LOW</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* VUFB */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-green-400 mb-3">Stage 2: VUFB Quick Check</div>
                <div className="space-y-3">
                  <ScoreSlider label="Value" value={newEpic.spotTest1.value.score} onChange={(v) => updateNewEpic('spotTest1.value.score', v)} />
                  <ScoreSlider label="Usability" value={newEpic.spotTest1.usability.score} onChange={(v) => updateNewEpic('spotTest1.usability.score', v)} />
                  <ScoreSlider label="Feasibility" value={newEpic.spotTest1.feasibility.score} onChange={(v) => updateNewEpic('spotTest1.feasibility.score', v)} />
                  <ScoreSlider label="Business" value={newEpic.spotTest1.business.score} onChange={(v) => updateNewEpic('spotTest1.business.score', v)} />
                </div>
                <div className="mt-3 text-center">
                  <span className="text-gray-400 text-sm">VUFB Score: </span>
                  <span className={`text-xl font-bold ${calculateVUFB(newEpic.spotTest1) >= 5 ? 'text-green-400' : 'text-red-400'}`}>
                    {calculateVUFB(newEpic.spotTest1).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Financial Inputs - Full NPV Calculation Details Style - MOVED ABOVE NDR */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="text-lg font-semibold text-yellow-400 mb-4">NPV Calculation Details</div>
                
                {/* NPV Formula */}
                <div className="bg-blue-900 bg-opacity-30 p-3 rounded mb-4">
                  <h5 className="text-md font-semibold text-blue-400 mb-2">NPV Formula</h5>
                  <div className="font-mono text-sm text-white">
                    NPV = -Initial Investment + Σ (Net Cash Flow<sub>t</sub> / (1 + r)<sup>t</sup>)
                  </div>
                  <div className="text-xs text-gray-300 mt-2">
                    Where: r = discount rate ({(newEpic.financial.discountRate * 100).toFixed(0)}%), t = year (1 to 5)
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    Net Cash Flow = Revenue - Operating Expenses (OpEx)
                  </div>
                </div>

                {/* Investment Costs - Editable Cards */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-sm text-gray-400 mb-1">Fixed Costs</div>
                    <div className="flex items-center">
                      <span className="text-white text-lg font-bold mr-1">$</span>
                      <input
                        type="number"
                        value={newEpic.financial.fixedCosts}
                        onChange={(e) => updateNewEpic('financial.fixedCosts', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 text-white text-lg font-bold rounded px-2 py-1 outline-none"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-sm text-gray-400 mb-1">Variable Costs</div>
                    <div className="flex items-center">
                      <span className="text-white text-lg font-bold mr-1">$</span>
                      <input
                        type="number"
                        value={newEpic.financial.variableCosts}
                        onChange={(e) => updateNewEpic('financial.variableCosts', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 text-white text-lg font-bold rounded px-2 py-1 outline-none"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-sm text-gray-400 mb-1">Total Investment</div>
                    <div className="text-lg font-bold text-red-400">
                      {formatCurrency(newEpic.financial.fixedCosts + newEpic.financial.variableCosts)}
                    </div>
                  </div>
                </div>

                {/* Discount Rate Input */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-sm text-gray-400">Discount Rate:</span>
                  <input
                    type="number"
                    step="1"
                    value={(newEpic.financial.discountRate * 100).toFixed(0)}
                    onChange={(e) => updateNewEpic('financial.discountRate', (parseFloat(e.target.value) || 10) / 100)}
                    className="w-16 bg-gray-700 text-white rounded px-2 py-1 text-sm outline-none text-center"
                  />
                  <span className="text-sm text-gray-400">%</span>
                </div>

                {/* Full 5-Year Cash Flow Table with Editable Inputs */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-800">
                        <th className="p-2 text-left text-gray-300">Year</th>
                        <th className="p-2 text-right text-gray-300">Revenue</th>
                        <th className="p-2 text-right text-gray-300">OpEx</th>
                        <th className="p-2 text-right text-gray-300">Net Flow</th>
                        <th className="p-2 text-right text-gray-300">Discount<br/>Factor</th>
                        <th className="p-2 text-right text-gray-300">PV of<br/>Flow</th>
                        <th className="p-2 text-right text-gray-300">Cumulative<br/>Undiscounted</th>
                        <th className="p-2 text-right text-gray-300">Cumulative<br/>NPV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Year 0 - Initial Investment */}
                      <tr className="border-t border-gray-700">
                        <td className="p-2 text-white font-semibold">0</td>
                        <td className="p-2 text-right text-gray-400">-</td>
                        <td className="p-2 text-right text-gray-400">-</td>
                        <td className="p-2 text-right text-red-400 font-semibold">{formatCurrency(-(newEpic.financial.fixedCosts + newEpic.financial.variableCosts))}</td>
                        <td className="p-2 text-right text-gray-400">1.000</td>
                        <td className="p-2 text-right text-red-400 font-semibold">{formatCurrency(-(newEpic.financial.fixedCosts + newEpic.financial.variableCosts))}</td>
                        <td className="p-2 text-right text-red-400 font-semibold">{formatCurrency(-(newEpic.financial.fixedCosts + newEpic.financial.variableCosts))}</td>
                        <td className="p-2 text-right text-red-400 font-bold">{formatCurrency(-(newEpic.financial.fixedCosts + newEpic.financial.variableCosts))}</td>
                      </tr>
                      {/* Years 1-5 with editable Revenue and OpEx */}
                      {(() => {
                        const totalInvestment = newEpic.financial.fixedCosts + newEpic.financial.variableCosts;
                        let runningUndiscounted = -totalInvestment;
                        let runningNPV = -totalInvestment;
                        return [1, 2, 3, 4, 5].map(year => {
                          const revenue = newEpic.financial.yearlyRevenue[year] || 0;
                          const opex = newEpic.financial.yearlyOpex[year] || 0;
                          const netCashFlow = revenue - opex;
                          const discountFactor = 1 / Math.pow(1 + newEpic.financial.discountRate, year);
                          const discountedFlow = netCashFlow * discountFactor;
                          runningUndiscounted += netCashFlow;
                          runningNPV += discountedFlow;
                          return (
                            <tr key={year} className="border-t border-gray-700">
                              <td className="p-2 text-white font-semibold">{year}</td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  value={revenue}
                                  onChange={(e) => {
                                    const updated = [...newEpic.financial.yearlyRevenue];
                                    updated[year] = parseFloat(e.target.value) || 0;
                                    updateNewEpic('financial.yearlyRevenue', updated);
                                  }}
                                  className="w-full bg-gray-700 text-green-400 rounded px-2 py-1 text-xs outline-none text-right"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  value={opex}
                                  onChange={(e) => {
                                    const updated = [...newEpic.financial.yearlyOpex];
                                    updated[year] = parseFloat(e.target.value) || 0;
                                    updateNewEpic('financial.yearlyOpex', updated);
                                  }}
                                  className="w-full bg-gray-700 text-red-400 rounded px-2 py-1 text-xs outline-none text-right"
                                />
                              </td>
                              <td className="p-2 text-right text-white font-semibold">{formatCurrency(netCashFlow)}</td>
                              <td className="p-2 text-right text-blue-300">{discountFactor.toFixed(3)}</td>
                              <td className="p-2 text-right text-blue-400 font-semibold">{formatCurrency(discountedFlow)}</td>
                              <td className="p-2 text-right font-semibold" style={{color: runningUndiscounted >= 0 ? '#10b981' : '#f87171'}}>
                                {formatCurrency(runningUndiscounted)}
                              </td>
                              <td className="p-2 text-right font-bold" style={{color: runningNPV >= 0 ? '#4ade80' : '#f87171'}}>
                                {formatCurrency(runningNPV)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Box */}
                <div className="mt-4 bg-gray-800 p-4 rounded border border-gray-600">
                  <h5 className="text-sm font-semibold text-white mb-3">Financial Summary</h5>
                  {(() => {
                    const totalInvestment = newEpic.financial.fixedCosts + newEpic.financial.variableCosts;
                    const totalUndiscounted = [1, 2, 3, 4, 5].reduce((sum, year) => {
                      const revenue = newEpic.financial.yearlyRevenue[year] || 0;
                      const opex = newEpic.financial.yearlyOpex[year] || 0;
                      return sum + (revenue - opex);
                    }, 0);
                    const totalDiscounted = [1, 2, 3, 4, 5].reduce((sum, year) => {
                      const revenue = newEpic.financial.yearlyRevenue[year] || 0;
                      const opex = newEpic.financial.yearlyOpex[year] || 0;
                      const netFlow = revenue - opex;
                      const discountFactor = 1 / Math.pow(1 + newEpic.financial.discountRate, year);
                      return sum + (netFlow * discountFactor);
                    }, 0);
                    const npv = totalDiscounted - totalInvestment;
                    const timeValueCost = totalUndiscounted - totalDiscounted;
                    const roiUndiscounted = totalInvestment > 0 ? totalUndiscounted / totalInvestment : 0;
                    const roiNPV = totalInvestment > 0 ? (npv + totalInvestment) / totalInvestment : 0;
                    
                    // Calculate payback period with month precision
                    let paybackPeriod = '>60 months';
                    let paybackYear = null;
                    let cumulative = -totalInvestment;
                    for (let year = 1; year <= 5; year++) {
                      const revenue = newEpic.financial.yearlyRevenue[year] || 0;
                      const opex = newEpic.financial.yearlyOpex[year] || 0;
                      const prevCumulative = cumulative;
                      cumulative += (revenue - opex);
                      if (cumulative >= 0 && prevCumulative < 0) {
                        paybackYear = year;
                        const netFlow = revenue - opex;
                        const monthsInYear = netFlow > 0 ? Math.ceil((Math.abs(prevCumulative) / netFlow) * 12) : 12;
                        const totalMonths = (year - 1) * 12 + monthsInYear;
                        paybackPeriod = `~${totalMonths} months`;
                        break;
                      }
                    }
                    
                    return (
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Cash In (undiscounted):</span>
                          <span className="text-green-400 font-semibold">{formatCurrency(totalUndiscounted)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Time Value Adjustment ({(newEpic.financial.discountRate * 100).toFixed(0)}%):</span>
                          <span className="text-red-400 font-semibold">-{formatCurrency(timeValueCost)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-700 pt-2">
                          <span className="text-gray-400">Present Value of Cash Flows:</span>
                          <span className="text-blue-400 font-semibold">{formatCurrency(totalDiscounted)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Less: Initial Investment:</span>
                          <span className="text-red-400 font-semibold">-{formatCurrency(totalInvestment)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-700 pt-2">
                          <span className="text-white font-bold">Net Present Value:</span>
                          <span className="text-2xl font-bold" style={{color: npv >= 0 ? '#10b981' : '#ef4444'}}>
                            {formatCurrency(npv)}
                          </span>
                        </div>
                        
                        {/* ROI and Payback with Formulas */}
                        <div className="border-t border-gray-700 pt-3 mt-3 space-y-3">
                          {/* ROI Undiscounted */}
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">ROI (undiscounted):</span>
                              <span className="text-green-400 font-semibold">{roiUndiscounted.toFixed(1)}×</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              = Total Cash In ÷ Investment = {formatCurrency(totalUndiscounted)} ÷ {formatCurrency(totalInvestment)} = {roiUndiscounted.toFixed(2)}×
                            </div>
                          </div>
                          
                          {/* ROI NPV-based */}
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">ROI (NPV-based):</span>
                              <span className="text-blue-400 font-semibold">{roiNPV.toFixed(1)}×</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              = (NPV + Investment) ÷ Investment = ({formatCurrency(npv)} + {formatCurrency(totalInvestment)}) ÷ {formatCurrency(totalInvestment)} = {roiNPV.toFixed(2)}×
                            </div>
                          </div>
                          
                          {/* Payback Period */}
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Payback Period:</span>
                              <span className="text-white font-semibold">{paybackPeriod}</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {paybackYear ? (
                                <>= Year when Cumulative Undiscounted ≥ $0 (crosses positive in Year {paybackYear})</>
                              ) : (
                                <>= Investment not recovered within 5-year horizon</>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Note */}
                <div className="mt-4 text-xs text-gray-400 italic">
                  <strong>Note:</strong> Discount factor for year t = 1 / (1 + {(newEpic.financial.discountRate * 100).toFixed(0)}%)<sup>t</sup>. 
                  The "Time Value Adjustment" shows the "cost of waiting" for future cash flows, accounting for the time value of money.
                </div>
              </div>

              {/* NDR Scores - NOW BELOW NPV */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold text-purple-400 mb-3">Stage 3: Full NDR Scoring</div>
                <div className="space-y-3">
                  <ScoreSlider label="UPAR" value={newEpic.ndr.upar.score} onChange={(v) => updateNewEpic('ndr.upar.score', v)} />
                  <ScoreSlider label="MAP" value={newEpic.ndr.map.score} onChange={(v) => updateNewEpic('ndr.map.score', v)} />
                  <ScoreSlider label="CEV" value={newEpic.ndr.cev.score} onChange={(v) => updateNewEpic('ndr.cev.score', v)} />
                  <ScoreSlider label="STAR" value={newEpic.ndr.star.score} onChange={(v) => updateNewEpic('ndr.star.score', v)} />
                  <ScoreSlider label="AI" value={newEpic.ndr.ai.score} onChange={(v) => updateNewEpic('ndr.ai.score', v)} />
                  <ScoreSlider label="VCRM" value={newEpic.ndr.vcrm.score} onChange={(v) => updateNewEpic('ndr.vcrm.score', v)} />
                  <ScoreSlider label="LAYER" value={newEpic.ndr.layer.score} onChange={(v) => updateNewEpic('ndr.layer.score', v)} />
                </div>
                <div className="mt-4 bg-gradient-to-r from-yellow-600 to-orange-600 p-3 rounded-lg text-center">
                  <div className="text-sm text-white">Calculated NDR Score</div>
                  <div className="text-2xl font-bold text-yellow-300">{calculateNDR(newEpic.ndr).ndrScore.toFixed(2)}</div>
                </div>
                
                {/* Sensitivity Analysis */}
                <div className="mt-4">
                  <label className="text-xs text-gray-400 block mb-1">Sensitivity Analysis</label>
                  <textarea
                    value={newEpic.sensitivity}
                    onChange={(e) => updateNewEpic('sensitivity', e.target.value)}
                    placeholder="What assumptions could change this score? (e.g., 'If LAYER drops below 6, decision flips to HOLD')"
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 h-16"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={addEpic}
                  disabled={!newEpic.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Add Epic to Stack Rank
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewEpic(createNewEpic()); }}
                  className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Breakdown */}
        {rankedEpics.length > 0 && (
          <div className="relative">
            <div className="absolute top-0 right-0 text-xs text-gray-600 font-light tracking-wide">Joseph Mar ™</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Detailed Breakdown - Full Scoring & NPV
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Expand each epic for complete scoring rationale and financial tables. Border colors: 🟢 Green = BUILD | 🟡 Yellow = PROTOTYPE | 🔴 Red = HOLD/KILL
            </p>
            {rankedEpics.map((epic, index) => (
              <div key={epic.id} className={"border-l-4 " + getPriorityBorderColor(epic.decision) + " border-2 border-gray-700 rounded-lg mb-4 bg-gray-800"}>
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-750"
                  onClick={() => setExpandedEpic(expandedEpic === epic.id ? null : epic.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-blue-400">#{index + 1}</span>
                        <h3 className="text-xl font-bold text-white">{epic.name}</h3>
                        <StatusIcon decision={epic.decision} />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeEpic(epic.id); }}
                          className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-400 mb-2">{epic.description}</p>
                      <div className="text-xs text-gray-400 italic mb-2">{epic.lifecycleContext}</div>
                      <div className="flex gap-4 text-sm flex-wrap">
                        <span className={"px-2 py-1 rounded " + (
                          epic.lifecycle === 'BUILD' ? 'bg-orange-900 text-orange-200' :
                          epic.lifecycle === 'GROW' ? 'bg-green-900 text-green-200' :
                          'bg-blue-900 text-blue-200'
                        )}>
                          {epic.lifecycle}
                        </span>
                        <span className="px-2 py-1 bg-purple-900 text-purple-200 rounded">
                          {epic.altitude}
                        </span>
                        <span className={"px-2 py-1 rounded font-semibold " + (
                          epic.decision.text === 'BUILD IMMEDIATELY' ? 'bg-green-900 text-green-200' : 
                          epic.decision.text === 'PROTOTYPE' ? 'bg-yellow-900 text-yellow-200' : 
                          'bg-red-900 text-red-200'
                        )}>
                          {epic.decision.text}
                        </span>
                        {epic.decision.gated && (
                          <span className="px-2 py-1 bg-red-900 text-red-200 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            GATED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-3xl font-bold" style={{color: epic.decision.text === 'BUILD IMMEDIATELY' ? '#4ade80' : epic.decision.text === 'PROTOTYPE' ? '#fbbf24' : '#f87171'}}>
                        {epic.ndrScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">NDR Score</div>
                      <div className="mt-2 text-sm text-gray-400">
                        NPV: {formatCurrency(epic.npv)}
                      </div>
                    </div>
                    {expandedEpic === epic.id ? <ChevronDown className="w-6 h-6 text-gray-400" /> : <ChevronRight className="w-6 h-6 text-gray-400" />}
                  </div>
                </div>

                {expandedEpic === epic.id && (
                  <div className="border-t-2 border-gray-700 p-4 bg-gray-900">
                    {/* WHY THIS SCORED X - Story First */}
                    <div className="mb-6 bg-gradient-to-r from-indigo-900 to-purple-900 p-5 rounded-lg">
                      <h4 className="text-xl font-bold text-white mb-3">
                        Why NDR = {epic.ndrScore.toFixed(2)} ({epic.decision.text})
                      </h4>
                      
                      <div className="space-y-3 text-sm text-gray-200">
                        <div>
                          <strong className="text-yellow-400">Key Drivers:</strong>
                          <ul className="mt-1 ml-4 space-y-1">
                            <li>• <strong>User Need:</strong> UPAR = {epic.ndr.upar.score.toFixed(1)}, MAP = {epic.ndr.map.score.toFixed(1)} 
                              {epic.ndr.upar.score >= 8 ? ' (Strong pain + frequency)' : epic.ndr.upar.score >= 6 ? ' (Moderate need)' : ' (Weak signal)'}
                            </li>
                            <li>• <strong>Financial Case:</strong> VCRM = {epic.ndr.vcrm.score.toFixed(1)}, NPV = {formatCurrency(epic.npv)}
                              {epic.ndr.vcrm.score >= 8 ? ' (Excellent ROI)' : epic.ndr.vcrm.score >= 6 ? ' (Good returns)' : ' (Weak economics)'}
                            </li>
                            <li>• <strong>Execution Risk:</strong> LAYER = {epic.ndr.layer.score.toFixed(1)}
                              {epic.ndr.layer.score >= 8 ? ' (Low risk, high feasibility)' : epic.ndr.layer.score >= 6 ? ' (Moderate risk)' : ' (High execution risk)'}
                            </li>
                          </ul>
                        </div>
                        
                        {epic.lifecycle === 'DEFEND' && (
                          <div className="pt-3 border-t border-white border-opacity-30">
                            <strong className="text-blue-400">DEFEND Score Decomposition:</strong>
                            <div className="mt-1">
                              • {epic.benefitPercent.toFixed(0)}% from Benefit (user/market need)<br/>
                              • {epic.financePercent.toFixed(0)}% from Finance (ROI/returns)
                              {epic.benefitPercent > 70 && (
                                <div className="text-yellow-300 mt-1">
                                  ⚠️ Warning: Defending primarily on benefit, not financial returns
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {epic.sensitivity && (
                          <div className="pt-3 border-t border-white border-opacity-30">
                            <strong className="text-orange-400">Sensitivity:</strong>
                            <div className="mt-1">{epic.sensitivity}</div>
                          </div>
                        )}
                        
                        <div className="pt-3 border-t border-white border-opacity-30">
                          <strong className={epic.decision.color}>Decision Rationale:</strong>
                          <div className="mt-1">{epic.decision.reason}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* NPV Calculation Details */}
                      <div className="border border-gray-700 rounded">
                        <button
                          onClick={() => toggleSection(epic.id, 'npv')}
                          className="w-full p-3 bg-gray-800 hover:bg-gray-750 flex items-center justify-between"
                        >
                          <span className="font-semibold text-yellow-400">NPV Calculation Details</span>
                          {expandedSections[epic.id + '-npv'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        {expandedSections[epic.id + '-npv'] && (
                          <div className="p-4">
                            <div className="bg-blue-900 bg-opacity-30 p-3 rounded mb-4">
                              <h5 className="text-md font-semibold text-blue-400 mb-2">NPV Formula</h5>
                              <div className="font-mono text-sm text-white">
                                NPV = -Initial Investment + Σ (Net Cash Flow<sub>t</sub> / (1 + r)<sup>t</sup>)
                              </div>
                              <div className="text-xs text-gray-300 mt-2">
                                Where: r = discount rate ({(epic.financial.discountRate * 100).toFixed(0)}%), t = year (1 to 5)
                              </div>
                              <div className="text-xs text-gray-300 mt-1">
                                Net Cash Flow = Revenue - Operating Expenses (OpEx)
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="bg-gray-800 p-3 rounded">
                                <div className="text-sm text-gray-400">Fixed Costs</div>
                                <div className="text-lg font-bold text-white">{formatCurrency(epic.financial.fixedCosts)}</div>
                              </div>
                              <div className="bg-gray-800 p-3 rounded">
                                <div className="text-sm text-gray-400">Variable Costs</div>
                                <div className="text-lg font-bold text-white">{formatCurrency(epic.financial.variableCosts)}</div>
                              </div>
                              <div className="bg-gray-800 p-3 rounded">
                                <div className="text-sm text-gray-400">Total Investment</div>
                                <div className="text-lg font-bold text-red-400">{formatCurrency(epic.financial.totalInvestment)}</div>
                              </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-800">
                                    <th className="p-2 text-left text-gray-300">Year</th>
                                    <th className="p-2 text-right text-gray-300">Revenue</th>
                                    <th className="p-2 text-right text-gray-300">OpEx</th>
                                    <th className="p-2 text-right text-gray-300">Net Flow</th>
                                    <th className="p-2 text-right text-gray-300">Discount<br/>Factor</th>
                                    <th className="p-2 text-right text-gray-300">PV of<br/>Flow</th>
                                    <th className="p-2 text-right text-gray-300">Cumulative<br/>Undiscounted</th>
                                    <th className="p-2 text-right text-gray-300">Cumulative<br/>NPV</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-t border-gray-700">
                                    <td className="p-2 text-white font-semibold">0</td>
                                    <td className="p-2 text-right text-gray-400">-</td>
                                    <td className="p-2 text-right text-gray-400">-</td>
                                    <td className="p-2 text-right text-red-400 font-semibold">{formatCurrency(-epic.financial.totalInvestment)}</td>
                                    <td className="p-2 text-right text-gray-400">1.000</td>
                                    <td className="p-2 text-right text-red-400 font-semibold">{formatCurrency(-epic.financial.totalInvestment)}</td>
                                    <td className="p-2 text-right text-red-400 font-semibold">{formatCurrency(-epic.financial.totalInvestment)}</td>
                                    <td className="p-2 text-right text-red-400 font-bold">{formatCurrency(-epic.financial.totalInvestment)}</td>
                                  </tr>
                                  {(() => {
                                    let runningUndiscounted = -epic.financial.totalInvestment;
                                    let runningNPV = -epic.financial.totalInvestment;
                                    return [1, 2, 3, 4, 5].map(year => {
                                      const revenue = epic.financial.yearlyRevenue[year] || 0;
                                      const opex = epic.financial.yearlyOpex[year] || 0;
                                      const netCashFlow = revenue - opex;
                                      const discountFactor = 1 / Math.pow(1 + epic.financial.discountRate, year);
                                      const discountedFlow = netCashFlow * discountFactor;
                                      runningUndiscounted += netCashFlow;
                                      runningNPV += discountedFlow;
                                      return (
                                        <tr key={year} className="border-t border-gray-700">
                                          <td className="p-2 text-white font-semibold">{year}</td>
                                          <td className="p-2 text-right text-green-400">{formatCurrency(revenue)}</td>
                                          <td className="p-2 text-right text-red-400">{formatCurrency(opex)}</td>
                                          <td className="p-2 text-right text-white font-semibold">{formatCurrency(netCashFlow)}</td>
                                          <td className="p-2 text-right text-blue-300">{discountFactor.toFixed(3)}</td>
                                          <td className="p-2 text-right text-blue-400 font-semibold">{formatCurrency(discountedFlow)}</td>
                                          <td className="p-2 text-right font-semibold" style={{color: runningUndiscounted >= 0 ? '#10b981' : '#f87171'}}>
                                            {formatCurrency(runningUndiscounted)}
                                          </td>
                                          <td className="p-2 text-right font-bold" style={{color: runningNPV >= 0 ? '#4ade80' : '#f87171'}}>
                                            {formatCurrency(runningNPV)}
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Financial Summary Box */}
                            <div className="mt-4 bg-gray-800 p-4 rounded border border-gray-600">
                              <h5 className="text-sm font-semibold text-white mb-3">Financial Summary</h5>
                              {(() => {
                                const totalUndiscounted = [1, 2, 3, 4, 5].reduce((sum, year) => {
                                  const revenue = epic.financial.yearlyRevenue[year] || 0;
                                  const opex = epic.financial.yearlyOpex[year] || 0;
                                  return sum + (revenue - opex);
                                }, 0);
                                const totalDiscounted = [1, 2, 3, 4, 5].reduce((sum, year) => {
                                  const revenue = epic.financial.yearlyRevenue[year] || 0;
                                  const opex = epic.financial.yearlyOpex[year] || 0;
                                  const netFlow = revenue - opex;
                                  const discountFactor = 1 / Math.pow(1 + epic.financial.discountRate, year);
                                  return sum + (netFlow * discountFactor);
                                }, 0);
                                const timeValueCost = totalUndiscounted - totalDiscounted;
                                const roiUndiscounted = totalUndiscounted / epic.financial.totalInvestment;
                                const roiNPV = (epic.npv + epic.financial.totalInvestment) / epic.financial.totalInvestment;
                                
                                return (
                                  <div className="space-y-2 text-xs font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Total Cash In (undiscounted):</span>
                                      <span className="text-green-400 font-semibold">{formatCurrency(totalUndiscounted)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Time Value Adjustment ({(epic.financial.discountRate * 100).toFixed(0)}%):</span>
                                      <span className="text-red-400 font-semibold">-{formatCurrency(timeValueCost)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-700 pt-2">
                                      <span className="text-gray-400">Present Value of Cash Flows:</span>
                                      <span className="text-blue-400 font-semibold">{formatCurrency(totalDiscounted)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Less: Initial Investment:</span>
                                      <span className="text-red-400 font-semibold">-{formatCurrency(epic.financial.totalInvestment)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-700 pt-2">
                                      <span className="text-white font-bold">Net Present Value:</span>
                                      <span className="text-2xl font-bold" style={{color: epic.npv >= 0 ? '#10b981' : '#ef4444'}}>
                                        {formatCurrency(epic.npv)}
                                      </span>
                                    </div>
                                    <div className="border-t border-gray-700 pt-2 mt-3">
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">ROI (undiscounted):</span>
                                        <span className="text-green-400 font-semibold">{roiUndiscounted.toFixed(1)}×</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">ROI (NPV-based):</span>
                                        <span className="text-blue-400 font-semibold">{roiNPV.toFixed(1)}×</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-400">Payback Period:</span>
                                        <span className="text-white font-semibold">
                                          {(() => {
                                            let cumulative = -epic.financial.totalInvestment;
                                            for (let year = 1; year <= 5; year++) {
                                              const revenue = epic.financial.yearlyRevenue[year] || 0;
                                              const opex = epic.financial.yearlyOpex[year] || 0;
                                              cumulative += (revenue - opex);
                                              if (cumulative >= 0) {
                                                return `~${year === 1 ? '11' : year === 2 ? '23' : year * 12} months`;
                                              }
                                            }
                                            return '>60 months';
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            
                            <div className="mt-4 text-xs text-gray-400 italic">
                              <strong>Note:</strong> Discount factor for year t = 1 / (1 + {(epic.financial.discountRate * 100).toFixed(0)}%)<sup>t</sup>. 
                              The "Time Value Adjustment" shows the {formatCurrency((() => {
                                const totalUndiscounted = [1, 2, 3, 4, 5].reduce((sum, year) => {
                                  const revenue = epic.financial.yearlyRevenue[year] || 0;
                                  const opex = epic.financial.yearlyOpex[year] || 0;
                                  return sum + (revenue - opex);
                                }, 0);
                                const totalDiscounted = [1, 2, 3, 4, 5].reduce((sum, year) => {
                                  const revenue = epic.financial.yearlyRevenue[year] || 0;
                                  const opex = epic.financial.yearlyOpex[year] || 0;
                                  const netFlow = revenue - opex;
                                  const discountFactor = 1 / Math.pow(1 + epic.financial.discountRate, year);
                                  return sum + (netFlow * discountFactor);
                                }, 0);
                                return totalUndiscounted - totalDiscounted;
                              })())} "cost of waiting" for future cash flows, accounting for the time value of money.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Full NDR Breakdown */}
                      <div className="border border-gray-700 rounded">
                        <button
                          onClick={() => toggleSection(epic.id, 'ndr')}
                          className="w-full p-3 bg-gray-800 hover:bg-gray-750 flex items-center justify-between"
                        >
                          <span className="font-semibold text-yellow-400">Full NDR Score Breakdown</span>
                          {expandedSections[epic.id + '-ndr'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        {expandedSections[epic.id + '-ndr'] && (
                          <div className="p-4 space-y-4">
                            <div>
                              <h5 className="text-md font-semibold text-green-400 mb-2">BenefitScore Components:</h5>
                              <div className="space-y-2">
                                {['upar', 'map', 'cev', 'star', 'ai'].map((key) => (
                                  <div key={key} className="bg-gray-800 p-3 rounded">
                                    <div className="flex justify-between items-start mb-1">
                                      <div className="flex-1">
                                        <div className="font-semibold text-white uppercase">{key}</div>
                                        <div className="text-xs text-gray-400">{epic.ndr[key].name}</div>
                                      </div>
                                      <div className="text-xl font-bold text-blue-400">{epic.ndr[key].score.toFixed(1)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 p-3 bg-green-900 bg-opacity-30 rounded">
                                <div className="font-mono text-sm text-white">
                                  BenefitScore = {epic.benefitScore.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="text-md font-semibold text-blue-400 mb-2">FinancialScore (VCRM):</h5>
                              <div className="bg-gray-800 p-3 rounded">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white">VCRM</div>
                                    <div className="text-xs text-gray-400">{epic.ndr.vcrm.name}</div>
                                  </div>
                                  <div className="text-xl font-bold text-blue-400">{epic.ndr.vcrm.score.toFixed(1)}</div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="text-md font-semibold text-purple-400 mb-2">FeasMult (LAYER):</h5>
                              <div className="bg-gray-800 p-3 rounded">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex-1">
                                    <div className="font-semibold text-white">LAYER</div>
                                    <div className="text-xs text-gray-400">{epic.ndr.layer.name}</div>
                                  </div>
                                  <div className="text-xl font-bold text-blue-400">{epic.ndr.layer.score.toFixed(1)}</div>
                                </div>
                              </div>
                              <div className="mt-3 p-3 bg-purple-900 bg-opacity-30 rounded">
                                <div className="font-mono text-sm text-white">
                                  FeasMult = 0.5 + 0.5 × ({epic.ndr.layer.score.toFixed(1)} / 10) = {epic.feasMult.toFixed(3)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4 rounded-lg">
                              <h5 className="text-lg font-bold text-white mb-2">FINAL CALCULATION:</h5>
                              <div className="font-mono text-sm text-white space-y-1">
                                <div>NDR = (0.5 × {epic.benefitScore.toFixed(2)} + 0.5 × {epic.financialScore.toFixed(2)}) × {epic.feasMult.toFixed(3)}</div>
                                <div className="text-2xl font-bold text-yellow-300">NDR = {epic.ndrScore.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {epics.length === 0 && !showAddForm && (
          <div className="text-center py-12 text-gray-500 bg-gray-800 rounded-lg">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-lg">No epics evaluated yet</p>
            <p className="text-sm">Use the "Add New Epic" button in Stage 3 to start scoring your work items</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default decisionOSTool;