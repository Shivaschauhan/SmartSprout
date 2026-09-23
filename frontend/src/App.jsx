import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  MessageSquare,
  PlusCircle,
  Compass,
  User as UserIcon,
  Droplet,
  Footprints,
  Flame,
  LogOut,
  Plus,
  Send,
  Brain,
  AlertTriangle,
  IndianRupee,
  TrendingUp,
  UserCheck,
  Camera,
  Search,
  X,
  Trash2,
  History,
  Sun,
  Moon,
} from 'lucide-react';
import {
  API_BASE,
  apiJson,
  identifyFoodPhoto,
  compressImage,
  batchLogFoods,
  pollPlanStatus,
  listChatSessions,
  createChatSession,
  deleteChatSession,
  getChatSessionMessages,
} from './api';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'drink', label: 'Drinks' },
  { id: 'snack', label: 'Snacks' },
  { id: 'condiment', label: 'Condiments' },
  { id: 'supplement', label: 'Supplements' },
];

export default function App() {
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState(token ? (user?.is_onboarded ? 'dashboard' : 'onboarding') : 'login');

  // Theme: persisted preference, falls back to the OS setting
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f7fb' : '#0c121c');
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const [todayWater, setTodayWater] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayCaloriesIn, setTodayCaloriesIn] = useState(0);
  const [todayCaloriesOut, setTodayCaloriesOut] = useState(0);
  const [activePlan, setActivePlan] = useState(null);
  const [customInstructions, setCustomInstructions] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [onboardAge, setOnboardAge] = useState(25);
  const [onboardGender, setOnboardGender] = useState('male');
  const [onboardHeight, setOnboardHeight] = useState(170);
  const [onboardWeight, setOnboardWeight] = useState(70);
  const [onboardDiet, setOnboardDiet] = useState(['veg']);
  const [onboardGoal, setOnboardGoal] = useState('maintain healthy');
  const [onboardAllergies, setOnboardAllergies] = useState('');
  const [onboardBudget, setOnboardBudget] = useState('Standard');

  const [foodLogs, setFoodLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);

  // Dynamic food catalog
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCategory, setFoodCategory] = useState('');
  const [catalogFoods, setCatalogFoods] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [logFoodQty, setLogFoodQty] = useState(100);
  const [logFoodUnit, setLogFoodUnit] = useState('g');
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: '', calories: 100, protein: 0, carbs: 0, fats: 0,
    reference_amount: 100, reference_unit: 'g', category: 'food', is_drink: false,
  });

  // Scan meal
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanPreview, setScanPreview] = useState(null);
  const scanInputRef = useRef(null);

  const [logWorkoutId, setLogWorkoutId] = useState('1');
  const [logWorkoutSets, setLogWorkoutSets] = useState(3);
  const [logWorkoutReps, setLogWorkoutReps] = useState(10);
  const [logWorkoutMins, setLogWorkoutMins] = useState(30);

  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatImageRef = useRef(null);
  const [chatImagePreview, setChatImagePreview] = useState(null);
  const [chatImageFile, setChatImageFile] = useState(null);
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);
  const historyOverlayRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      const toggleBtn = document.getElementById('past-chats-toggle-btn');
      if (
        historyOverlayRef.current &&
        !historyOverlayRef.current.contains(event.target) &&
        (!toggleBtn || !toggleBtn.contains(event.target))
      ) {
        setShowHistoryOverlay(false);
      }
    };
    if (showHistoryOverlay) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistoryOverlay]);

  // Profile states
  const [profileName, setProfileName] = useState('');
  const [profileAge, setProfileAge] = useState(25);
  const [profileGender, setProfileGender] = useState('male');
  const [profileHeight, setProfileHeight] = useState(170);
  const [profileWeight, setProfileWeight] = useState(70);
  const [profileTargetWeight, setProfileTargetWeight] = useState(70);
  const [profileDiet, setProfileDiet] = useState(['veg']);
  const [profileGoal, setProfileGoal] = useState('weight loss');
  const [profileAllergies, setProfileAllergies] = useState('None');
  const [profileBudget, setProfileBudget] = useState('Standard');
  const [profileLoading, setProfileLoading] = useState(false);

  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [foodLogLoading, setFoodLogLoading] = useState(false);
  const [workoutLogLoading, setWorkoutLogLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genStatusMsg, setGenStatusMsg] = useState('');

  const availableWorkouts = [
    { id: '1', name: 'Push-ups', unit: 'reps' },
    { id: '2', name: 'Squats', unit: 'reps' },
    { id: '3', name: 'Jumping Jacks', unit: 'minutes' },
    { id: '4', name: 'Surya Namaskar', unit: 'reps' },
    { id: '5', name: 'Plank', unit: 'minutes' },
    { id: '6', name: 'Lunges', unit: 'reps' },
    { id: '7', name: 'Mountain Climbers', unit: 'minutes' },
    { id: '8', name: 'Burpees', unit: 'reps' },
    { id: '9', name: 'Cycling (indoor)', unit: 'minutes' },
    { id: '10', name: 'Yoga (general)', unit: 'minutes' },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchCatalog = useCallback(async (search = '', category = '', autoSelect = false) => {
    if (!token) return;
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', per_page: '40' });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const data = await apiJson(`/foods/?${params}`, { token });
      setCatalogFoods(data.items || []);
      if (autoSelect && data.items?.length) {
        setSelectedFood((prev) => {
          if (prev) return prev;
          const first = data.items[0];
          const { unit, qty } = getDefaultUnitAndQty(first);
          setLogFoodUnit(unit);
          setLogFoodQty(qty);
          return first;
        });
      }
    } catch (err) {
      console.error('Catalog load failed', err);
    } finally {
      setCatalogLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && screen === 'dashboard') fetchDashboardStats();
    if (token && screen === 'logs') {
      fetchLogsList();
      fetchCatalog(foodSearch, foodCategory, true);
    }
    if (token && screen === 'plans') fetchDashboardStats();
    if (token && screen === 'chat') {
      fetchChatSessions(true);
    }
  }, [screen, token]);

  // Initialize profile form values when entering profile screen
  useEffect(() => {
    if (screen === 'profile' && user) {
      setProfileName(user.name || '');
      setProfileAge(user.age || 25);
      setProfileGender(user.gender || 'male');
      setProfileHeight(user.height_cm || 170);
      setProfileWeight(user.weight_kg || 70);
      setProfileTargetWeight(user.target_weight || user.weight_kg || 70);
      setProfileDiet(user.dietary_prefs || ['veg']);
      setProfileGoal(user.goals || 'weight loss');
      setProfileAllergies(user.allergies || 'None');
      setProfileBudget(user.budget || 'Standard');
    }
  }, [screen, user]);

  // Debounced food search
  useEffect(() => {
    if (screen !== 'logs' || !token) return;
    const t = setTimeout(() => fetchCatalog(foodSearch, foodCategory), 300);
    return () => clearTimeout(t);
  }, [foodSearch, foodCategory]);

  const fetchDashboardStats = async () => {
    try {
      const data = await apiJson('/dashboard/today', { token });
      setTodayWater(data.water || 0);
      setTodaySteps(data.steps || 0);
      setTodayCaloriesIn(data.calories_in || 0);
      setTodayCaloriesOut(data.calories_out || 0);
      setActivePlan(data.active_plan || null);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    }
  };

  const fetchLogsList = async () => {
    try {
      const data = await apiJson('/food-logs/', { token });
      setFoodLogs(Array.isArray(data) ? data : []);
      const dataW = await apiJson('/workout-logs/', { token });
      setWorkoutLogs(Array.isArray(dataW) ? dataW : []);
    } catch (err) {
      console.error('Error loading logs', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setRegisterLoading(true);
    try {
      const data = await apiJson('/auth/register', {
        method: 'POST',
        body: { email, password, name },
      });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      setScreen('onboarding');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoginLoading(true);
    try {
      const data = await apiJson('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      setScreen(data.user.is_onboarded ? 'dashboard' : 'onboarding');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setOnboardLoading(true);
    try {
      const data = await apiJson('/auth/onboarding', {
        token,
        method: 'POST',
        body: {
          age: onboardAge,
          gender: onboardGender,
          height_cm: onboardHeight,
          weight_kg: onboardWeight,
          dietary_prefs: onboardDiet,
          goals: onboardGoal,
          allergies: onboardAllergies || 'None',
          budget: onboardBudget,
        },
      });
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      setScreen('dashboard');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      alert("Name is required");
      return;
    }
    setProfileLoading(true);
    try {
      const data = await apiJson('/user/me', {
        token,
        method: 'PUT',
        body: {
          name: profileName.trim(),
          age: profileAge,
          height_cm: profileHeight,
          weight_kg: profileWeight,
          dietary_prefs: profileDiet,
          allergies: profileAllergies || 'None',
          budget: profileBudget,
          goals: profileGoal,
          target_weight: profileTargetWeight
        }
      });
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      alert("Profile updated successfully!");
      setScreen('dashboard');
    } catch (err) {
      alert("Error updating profile: " + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddWater = async (amount) => {
    try {
      setTodayWater((w) => w + amount);
      await apiJson('/tracking/water', { token, method: 'POST', body: { amount } });
      fetchDashboardStats();
    } catch (err) {
      console.error(err);
      fetchDashboardStats();
    }
  };

  const handleAddSteps = async (steps) => {
    if (!steps || steps <= 0) return;
    try {
      setTodaySteps((s) => s + steps);
      await apiJson('/tracking/steps', { token, method: 'POST', body: { steps } });
      fetchDashboardStats();
    } catch (err) {
      console.error(err);
      fetchDashboardStats();
    }
  };

  const handleResetWater = async () => {
    if (!confirm("Are you sure you want to reset today's water intake?")) return;
    try {
      setTodayWater(0);
      await apiJson('/tracking/water', { token, method: 'DELETE' });
      fetchDashboardStats();
    } catch (err) {
      console.error(err);
      fetchDashboardStats();
    }
  };

  const handleResetSteps = async () => {
    if (!confirm("Are you sure you want to reset today's step count?")) return;
    try {
      setTodaySteps(0);
      await apiJson('/tracking/steps', { token, method: 'DELETE' });
      fetchDashboardStats();
    } catch (err) {
      console.error(err);
      fetchDashboardStats();
    }
  };

  const handleDeleteFoodLog = async (logId) => {
    if (!confirm("Are you sure you want to delete this food log?")) return;
    try {
      await apiJson(`/food-logs/${logId}`, { token, method: 'DELETE' });
      fetchLogsList();
      fetchDashboardStats();
    } catch (err) {
      alert("Error deleting food log: " + err.message);
    }
  };

  const handleDeleteWorkoutLog = async (logId) => {
    if (!confirm("Are you sure you want to delete this workout log?")) return;
    try {
      await apiJson(`/workout-logs/${logId}`, { token, method: 'DELETE' });
      fetchLogsList();
      fetchDashboardStats();
    } catch (err) {
      alert("Error deleting workout log: " + err.message);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const listMatch = line.match(/^[\*\-]\s+(.*)$/);
      let content = line;
      let isListItem = false;
      if (listMatch) {
        content = listMatch[1];
        isListItem = true;
      }
      const parts = [];
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index}>{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }
      const elementContent = parts.length > 0 ? parts : content;
      if (isListItem) {
        return (
          <li key={idx} style={{ marginLeft: '16px', marginBottom: '4px', listStyleType: 'disc' }}>
            {elementContent}
          </li>
        );
      }
      return (
        <div key={idx} style={{ minHeight: '18px', marginBottom: '6px' }}>
          {elementContent}
        </div>
      );
    });
  };

  const unitsForFood = (food) => {
    if (!food) return ['g'];
    const units = [food.reference_unit];
    const conv = food.unit_conversions || {};
    Object.keys(conv).forEach((u) => {
      if (!units.includes(u)) units.push(u);
    });
    return units;
  };

  const getDefaultUnitAndQty = (food) => {
    if (!food) return { unit: 'g', qty: 100 };
    const priorityUnits = [
      'piece', 'serving', 'plate', 'cup', 'glass', 'slice',
      'bowl', 'scoop', 'can', 'pint', 'square', 'handful',
      'tbsp', 'tsp'
    ];
    const convKeys = Object.keys(food.unit_conversions || {});
    const foundUnit = priorityUnits.find(u => convKeys.includes(u));
    if (foundUnit) {
      return { unit: foundUnit, qty: 1 };
    }
    return {
      unit: food.reference_unit || 'g',
      qty: Number(food.reference_amount) || 100
    };
  };

  const handleSelectFood = (food) => {
    setSelectedFood(food);
    const { unit, qty } = getDefaultUnitAndQty(food);
    setLogFoodUnit(unit);
    setLogFoodQty(qty);
  };

  const handleUnitChange = (newUnit) => {
    if (!selectedFood) {
      setLogFoodUnit(newUnit);
      return;
    }
    const qty = parseFloat(logFoodQty) || 0;
    const oldUnit = logFoodUnit;
    if (qty <= 0) {
      setLogFoodUnit(newUnit);
      return;
    }
    let qtyInBase = qty;
    if (oldUnit !== selectedFood.reference_unit) {
      const convRatio = selectedFood.unit_conversions?.[oldUnit];
      if (convRatio) {
        qtyInBase = qty * convRatio;
      }
    }
    let newQty = qtyInBase;
    if (newUnit !== selectedFood.reference_unit) {
      const convRatio = selectedFood.unit_conversions?.[newUnit];
      if (convRatio) {
        newQty = qtyInBase / convRatio;
      }
    }
    newQty = Math.round(newQty * 100) / 100;
    setLogFoodQty(newQty);
    setLogFoodUnit(newUnit);
  };

  const handleLogFood = async (e) => {
    e.preventDefault();
    if (!selectedFood) return alert('Select a food or drink first');
    setFoodLogLoading(true);
    try {
      await apiJson('/food-logs/', {
        token,
        method: 'POST',
        body: {
          food_id: selectedFood.id,
          quantity: parseFloat(logFoodQty),
          unit: logFoodUnit,
        },
      });
      alert('Food logged successfully!');
      fetchLogsList();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setFoodLogLoading(false);
    }
  };

  const handleCreateCustomFood = async (e) => {
    e.preventDefault();
    try {
      const created = await apiJson('/foods/', {
        token,
        method: 'POST',
        body: {
          ...customFood,
          is_drink: customFood.category === 'drink' || customFood.is_drink,
          name: customFood.name.trim(),
        },
      });
      setShowCustomFood(false);
      setCustomFood({
        name: '', calories: 100, protein: 0, carbs: 0, fats: 0,
        reference_amount: 100, reference_unit: 'g', category: 'food', is_drink: false,
      });
      handleSelectFood(created);
      fetchCatalog(foodSearch, foodCategory);
      alert(`Added "${created.name}" to your catalog`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleScanFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanPreview(URL.createObjectURL(file));
    setScanLoading(true);
    setScanResult(null);
    try {
      const result = await identifyFoodPhoto(token, file);
      setScanResult(result);
    } catch (err) {
      alert('Scan failed: ' + err.message);
    } finally {
      setScanLoading(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const updateScanItem = (idx, patch) => {
    setScanResult((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...prev, items };
    });
  };

  const removeScanItem = (idx) => {
    setScanResult((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== idx) };
    });
  };

  const handleConfirmScan = async () => {
    if (!scanResult?.items?.length) return;
    setScanLoading(true);
    try {
      await batchLogFoods(token, scanResult.items, scanResult.meal_suggestion);
      alert(`Logged ${scanResult.items.length} item(s) from scan!`);
      setScanResult(null);
      setScanPreview(null);
      fetchLogsList();
      fetchDashboardStats();
    } catch (err) {
      alert('Error logging scan: ' + err.message);
    } finally {
      setScanLoading(false);
    }
  };

  const handleLogWorkout = async (e) => {
    e.preventDefault();
    setWorkoutLogLoading(true);
    const workout = availableWorkouts.find((w) => w.id === logWorkoutId);
    const body = { workout_id: parseInt(logWorkoutId) };
    if (workout.unit === 'reps') {
      body.sets = logWorkoutSets;
      body.reps_per_set = logWorkoutReps;
    } else {
      body.duration_minutes = logWorkoutMins;
    }
    try {
      await apiJson('/workout-logs/', { token, method: 'POST', body });
      alert('Workout logged successfully!');
      fetchLogsList();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setWorkoutLogLoading(false);
    }
  };

  const handleWorkoutChange = (workoutId) => {
    setLogWorkoutId(workoutId);
    const workout = availableWorkouts.find(w => w.id === workoutId);
    if (workout) {
      if (workout.unit === 'reps') {
        if (workout.name === 'Push-ups') { setLogWorkoutSets(3); setLogWorkoutReps(10); }
        else if (workout.name === 'Squats') { setLogWorkoutSets(3); setLogWorkoutReps(12); }
        else if (workout.name === 'Lunges') { setLogWorkoutSets(3); setLogWorkoutReps(10); }
        else if (workout.name === 'Surya Namaskar') { setLogWorkoutSets(1); setLogWorkoutReps(12); }
        else if (workout.name === 'Burpees') { setLogWorkoutSets(3); setLogWorkoutReps(8); }
        else { setLogWorkoutSets(3); setLogWorkoutReps(10); }
      } else {
        if (workout.name === 'Plank') setLogWorkoutMins(2);
        else if (workout.name === 'Jumping Jacks') setLogWorkoutMins(10);
        else if (workout.name === 'Mountain Climbers') setLogWorkoutMins(5);
        else if (workout.name === 'Cycling (indoor)') setLogWorkoutMins(20);
        else if (workout.name === 'Yoga (general)') setLogWorkoutMins(30);
        else setLogWorkoutMins(15);
      }
    }
  };

  const handleGeneratePlan = async () => {
    setGenLoading(true);
    setGenStatusMsg('Starting multi-agent plan…');
    try {
      const start = await apiJson('/generate-plan/complete', {
        token,
        method: 'POST',
        body: { custom_instructions: customInstructions }
      });
      setGenStatusMsg('Agents coordinating meals & workouts…');
      const status = await pollPlanStatus(token, start.task_id, {
        intervalMs: 1500,
        maxWaitMs: 180000,
      });
      if (status.status === 'failed') throw new Error(status.error || 'Plan failed');
      if (!isMounted.current) return;
      alert('SmartSprout agentic plan generated successfully!');
      await fetchDashboardStats();
      setScreen('plans');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGenLoading(false);
      setGenStatusMsg('');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatImageFile) return;

    let base64Preview = null;
    let compressedFile = null;

    if (chatImageFile) {
      try {
        compressedFile = await compressImage(chatImageFile, 800, 0.7);
        base64Preview = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(compressedFile);
        });
      } catch (err) {
        console.error("Compression failed, using raw file", err);
        compressedFile = chatImageFile;
        base64Preview = chatImagePreview;
      }
    }

    const userMessage = {
      role: 'user',
      content: chatInput || (chatImageFile ? 'Please identify the foods in this photo and help me log them.' : ''),
      image_preview: base64Preview || chatImagePreview || null,
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    const fileToUpload = compressedFile || chatImageFile;
    setChatImageFile(null);
    setChatImagePreview(null);

    try {
      let data;
      if (fileToUpload) {
        const fd = new FormData();
        fd.append('messages', JSON.stringify([...chatMessages, userMessage]));
        fd.append('file', fileToUpload);
        if (activeSessionId) {
          fd.append('session_id', activeSessionId);
        }
        if (base64Preview) {
          fd.append('image_preview', base64Preview);
        }
        data = await apiJson('/chat/with-image', {
          token,
          method: 'POST',
          body: fd
        });
      } else {
        data = await apiJson('/chat/', {
          token,
          method: 'POST',
          body: { messages: [...chatMessages, userMessage], session_id: activeSessionId },
        });
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      fetchChatSessions(false);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchChatSessions = useCallback(async (autoSelectFirst = false) => {
    if (!token) return;
    try {
      const data = await listChatSessions(token);
      setChatSessions(data);
      if (data.length > 0) {
        if (autoSelectFirst) {
          setActiveSessionId((prev) => {
            if (!prev) {
              getChatSessionMessages(token, data[0].id).then(setChatMessages);
              return data[0].id;
            }
            return prev;
          });
        }
      } else {
        const newSession = await createChatSession(token, "New Chat");
        setChatSessions([newSession]);
        setActiveSessionId(newSession.id);
        setChatMessages([]);
      }
    } catch (err) {
      setChatMessages([{ role: 'assistant', content: 'Error loading chat history: ' + err.message }]);
    }
  }, [token]);

  const loadSessionMessages = async (sessionId) => {
    if (!token) return;
    try {
      const data = await getChatSessionMessages(token, sessionId);
      setChatMessages(data);
    } catch (err) {
      setChatMessages([{ role: 'assistant', content: 'Error loading chat messages: ' + err.message }]);
    }
  };

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    loadSessionMessages(sessionId);
  };

  const handleCreateNewSession = async () => {
    if (!token) return;
    if (chatMessages.length === 0) return; // Already on an empty chat state, do nothing
    try {
      const newSession = await createChatSession(token, "New Chat");
      setChatSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setChatMessages([]);
    } catch (err) {
      alert("Error creating new session: " + err.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Are you sure you want to delete this conversation history?")) return;
    try {
      await deleteChatSession(token, sessionId);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setChatMessages([]);
        await fetchChatSessions(true);
      }
    } catch (err) {
      alert("Error deleting session: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setScreen('login');
  };

  const calorieTarget = user?.goals === 'weight loss' ? 1800 : user?.goals === 'weight gain' ? 2800 : 2200;
  const progressPct = Math.round(Math.min(todayCaloriesIn / calorieTarget, 1) * 100);

  return (
    <div className="app-container">
      {token && ['dashboard', 'logs', 'chat', 'plans', 'profile'].includes(screen) && (
        <div className="sidebar-nav">
          <div className="sidebar-header">
            <Brain size={28} className="sidebar-logo" />
            <span className="sidebar-brand">SmartSprout</span>
          </div>
          <div className="sidebar-menu">
            <div className={`sidebar-item ${screen === 'dashboard' ? 'active' : ''}`} onClick={() => setScreen('dashboard')}>
              <Activity size={20} /><span>Dashboard</span>
            </div>
            <div className={`sidebar-item ${screen === 'logs' ? 'active' : ''}`} onClick={() => setScreen('logs')}>
              <PlusCircle size={20} /><span>Log Activity</span>
            </div>
            <div className={`sidebar-item ${screen === 'chat' ? 'active' : ''}`} onClick={() => setScreen('chat')}>
              <MessageSquare size={20} /><span>AI Coach</span>
            </div>
            <div className={`sidebar-item ${screen === 'plans' ? 'active' : ''}`} onClick={() => setScreen('plans')}>
              <Compass size={20} /><span>Health Plan</span>
            </div>
          </div>
          <div className="sidebar-footer">
            <div className={`sidebar-user ${screen === 'profile' ? 'active' : ''}`} onClick={() => setScreen('profile')}>
              <UserIcon size={18} style={{ color: 'var(--color-emerald)' }} />
              <span className="sidebar-user-name" title={user?.email}>{user?.name || 'User'}</span>
            </div>
            <button className="sidebar-appearance" onClick={toggleTheme}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                Appearance
              </span>
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
            <button className="sidebar-btn-logout" onClick={handleLogout}>
              <LogOut size={16} /><span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <div className="main-content-wrapper">
        {token && (
          <div className="header-bar">
            <div className="header-title" onClick={() => setScreen('dashboard')}>SmartSprout</div>
            <div className="header-actions">
              <button
                className={`btn btn-secondary btn-icon theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                className={`btn btn-secondary btn-sm header-profile-btn ${screen === 'profile' ? 'active' : ''}`}
                onClick={() => setScreen('profile')}
                title="Profile"
              >
                <UserIcon size={15} style={{ color: 'var(--color-emerald)' }} />
                <span className="profile-btn-txt">{user?.name || 'Profile'}</span>
              </button>
              <button className="btn btn-secondary btn-icon" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        {screen === 'login' && (
          <div className="screen-content auth-screen animate-slide-up">
            <div className="auth-brand">
              <div className="auth-logo">
                <Brain size={40} />
              </div>
              <h2>SmartSprout</h2>
              <p>Your personal AI health companion</p>
            </div>
            <form className="card auth-card" onSubmit={handleLogin}>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input-field" type="email" placeholder="you@domain.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input-field" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {errorMsg && <p className="form-error">{errorMsg}</p>}
              <button className="btn btn-block" type="submit" disabled={loginLoading}>
                {loginLoading ? <span className="spinner" /> : null}
                Sign in
              </button>
            </form>
            <p className="link-text">
              New here?{' '}
              <span className="link-action" onClick={() => setScreen('register')}>Create an account</span>
            </p>
          </div>
        )}

        {screen === 'register' && (
          <div className="screen-content auth-screen animate-slide-up">
            <div className="auth-brand">
              <div className="auth-logo">
                <Brain size={36} />
              </div>
              <h2>Create account</h2>
              <p>Set up your wellness profile in minutes</p>
            </div>
            <form className="card auth-card" onSubmit={handleRegister}>
              <div className="input-group">
                <label className="input-label">Full name</label>
                <input className="input-field" type="text" placeholder="Your name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input-field" type="email" placeholder="you@domain.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input-field" type="password" placeholder="At least 8 characters" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {errorMsg && <p className="form-error">{errorMsg}</p>}
              <button className="btn btn-block" type="submit" disabled={registerLoading}>
                {registerLoading ? <span className="spinner" /> : null}
                Continue
              </button>
            </form>
            <p className="link-text">
              Already have an account?{' '}
              <span className="link-action" onClick={() => setScreen('login')}>Sign in</span>
            </p>
          </div>
        )}

        {screen === 'onboarding' && (
          <div className="screen-content onboarding-screen animate-slide-up">
            <div className="screen-header">
              <span className="screen-kicker">Step 1 of 1</span>
              <h2>Personalize your plan</h2>
              <p className="screen-subtitle">These preferences guide meals, workouts, and safety checks.</p>
            </div>
            <form className="card form-stack" onSubmit={handleOnboardingSubmit}>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Age</label>
                  <input className="input-field" type="number" min="1" max="120" value={onboardAge} onChange={(e) => setOnboardAge(e.target.value === '' ? '' : parseInt(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Gender</label>
                  <select className="input-field input-select" value={onboardGender} onChange={(e) => setOnboardGender(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Height (cm)</label>
                  <input className="input-field" type="number" value={onboardHeight} onChange={(e) => setOnboardHeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Weight (kg)</label>
                  <input className="input-field" type="number" value={onboardWeight} onChange={(e) => setOnboardWeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Diet</label>
                <div className="choices-grid cols-3">
                  <div className={`choice-chip compact ${onboardDiet.includes('veg') ? 'selected' : ''}`} onClick={() => setOnboardDiet(['veg'])} role="button" tabIndex={0}>
                    <span className="choice-title">Vegetarian</span>
                    <span className="choice-desc">Plant-based + dairy/eggs</span>
                  </div>
                  <div className={`choice-chip compact ${onboardDiet.includes('vegan') ? 'selected' : ''}`} onClick={() => setOnboardDiet(['vegan'])} role="button" tabIndex={0}>
                    <span className="choice-title">Vegan</span>
                    <span className="choice-desc">Fully plant-based</span>
                  </div>
                  <div className={`choice-chip compact ${onboardDiet.includes('non-veg') ? 'selected' : ''}`} onClick={() => setOnboardDiet(['non-veg'])} role="button" tabIndex={0}>
                    <span className="choice-title">Non-veg</span>
                    <span className="choice-desc">Includes meat & fish</span>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Primary goal</label>
                <div className="choices-grid cols-3">
                  <div className={`choice-chip ${onboardGoal === 'weight loss' ? 'selected' : ''}`} onClick={() => setOnboardGoal('weight loss')} role="button" tabIndex={0}>
                    <span className="choice-title">Lose weight</span>
                    <span className="choice-desc">Calorie deficit focus</span>
                  </div>
                  <div className={`choice-chip ${onboardGoal === 'weight gain' ? 'selected' : ''}`} onClick={() => setOnboardGoal('weight gain')} role="button" tabIndex={0}>
                    <span className="choice-title">Build muscle</span>
                    <span className="choice-desc">Surplus + strength</span>
                  </div>
                  <div className={`choice-chip ${onboardGoal === 'maintain healthy' ? 'selected' : ''}`} onClick={() => setOnboardGoal('maintain healthy')} role="button" tabIndex={0}>
                    <span className="choice-title">Maintain</span>
                    <span className="choice-desc">Balanced habits</span>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Allergies</label>
                <input className="input-field" type="text" placeholder="Peanuts, dairy, gluten — or leave blank" value={onboardAllergies} onChange={(e) => setOnboardAllergies(e.target.value)} />
                <span className="input-hint">Used by the safety critic when generating plans</span>
              </div>
              <div className="input-group">
                <label className="input-label">Food budget</label>
                <div className="choices-grid cols-3">
                  <div className={`choice-chip compact ${onboardBudget === 'Low' ? 'selected' : ''}`} onClick={() => setOnboardBudget('Low')} role="button" tabIndex={0}>
                    <span className="choice-title">Budget</span>
                    <span className="choice-desc">Affordable staples</span>
                  </div>
                  <div className={`choice-chip compact ${onboardBudget === 'Standard' ? 'selected' : ''}`} onClick={() => setOnboardBudget('Standard')} role="button" tabIndex={0}>
                    <span className="choice-title">Standard</span>
                    <span className="choice-desc">Everyday variety</span>
                  </div>
                  <div className={`choice-chip compact ${onboardBudget === 'Premium' ? 'selected' : ''}`} onClick={() => setOnboardBudget('Premium')} role="button" tabIndex={0}>
                    <span className="choice-title">Premium</span>
                    <span className="choice-desc">Organic / specialty</span>
                  </div>
                </div>
              </div>
              {errorMsg && <p className="form-error">{errorMsg}</p>}
              <button className="btn btn-block" type="submit" disabled={onboardLoading}>
                {onboardLoading ? <span className="spinner" /> : <UserCheck size={18} />}
                Finish setup
              </button>
            </form>
          </div>
        )}

        {screen === 'dashboard' && (
          <div className="screen-content has-nav dashboard-screen animate-slide-up">
            <div className="greeting-block">
              <span className="greeting-hi">Welcome back</span>
              <h2>{user?.name ? user.name.split(' ')[0] : 'there'}</h2>
            </div>

            <div className="card calorie-card">
              <div className="calorie-head">
                <p className="card-title-muted">Today’s calories</p>
                <p className="calorie-count">
                  <span className="calorie-num">{Math.round(todayCaloriesIn)}</span>
                  <span className="calorie-target">/ {calorieTarget} kcal</span>
                </p>
              </div>
              <div
                className="calorie-bar"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="calorie-bar-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="stat-split">
                <div className="stat-split-item">
                  <p className="stat-label">Burned</p>
                  <p className="stat-value" style={{ color: 'var(--color-cyan)' }}>
                    <Flame size={14} /> {Math.round(todayCaloriesOut)} kcal
                  </p>
                </div>
                <div className="stat-divider" />
                <div className="stat-split-item">
                  <p className="stat-label">Budget</p>
                  <p className="stat-value" style={{ color: 'var(--accent)' }}>
                    <IndianRupee size={14} /> {user?.budget || 'Standard'}
                  </p>
                </div>
              </div>
            </div>

            <div className="logs-grid dashboard-logs-grid">
              <div className="card metric-card">
                <div className="metric-card-head" style={{ color: 'var(--color-cyan)' }}>
                  <div className="metric-card-label">
                    <Droplet size={18} /><span>Hydration</span>
                  </div>
                  {todayWater > 0 && (
                    <button className="btn-ghost" onClick={handleResetWater} title="Reset today's water">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="metric-value">{todayWater}<span>ml</span></div>
                <div className="metric-actions">
                  <button className="btn btn-sm" onClick={() => handleAddWater(250)}>+250</button>
                  <button className="btn btn-sm" onClick={() => handleAddWater(500)}>+500</button>
                </div>
              </div>
              <div className="card metric-card">
                <div className="metric-card-head" style={{ color: 'var(--color-emerald)' }}>
                  <div className="metric-card-label">
                    <Footprints size={18} /><span>Steps</span>
                  </div>
                  {todaySteps > 0 && (
                    <button className="btn-ghost" onClick={handleResetSteps} title="Reset today's steps">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="metric-value">{todaySteps}<span>steps</span></div>
                <div className="metric-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      const num = prompt('Enter steps walked:');
                      if (num) handleAddSteps(parseInt(num));
                    }}
                  >
                    <Plus size={14} /> Add steps
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {screen === 'logs' && (
          <div className="screen-content has-nav logs-screen animate-slide-up">
            <div className="screen-header">
              <h2>Log activity</h2>
              <p className="screen-subtitle">Search the catalog, scan a meal, or log a workout.</p>
            </div>

            {/* Food log form */}
            <form className="card food-log-card" onSubmit={handleLogFood}>
              <div className="card-header">
                <h3 className="card-title">Nutrition</h3>
              </div>

              <div className="input-group">
                <label className="input-label">Search foods & drinks</label>
                <div className="input-with-icon">
                  <Search size={16} className="input-icon" />
                  <input
                    className="input-field"
                    type="search"
                    placeholder="Chapati, coffee, protein shake…"
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="category-chips">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id || 'all'}
                    type="button"
                    className={`choice-chip ${foodCategory === c.id ? 'selected' : ''}`}
                    onClick={() => setFoodCategory(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="food-catalog-list">
                {catalogLoading && <p className="empty-hint">Loading…</p>}
                {!catalogLoading && catalogFoods.length === 0 && (
                  <p className="empty-hint">No matches. Add a custom food below.</p>
                )}
                {catalogFoods.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFood(f)}
                    className={`food-pick-item ${selectedFood?.id === f.id ? 'selected' : ''}`}
                  >
                    <div className="food-pick-name">{f.name}</div>
                    <div className="food-pick-meta">
                      {f.category}{f.is_drink ? ' · drink' : ''} · {Math.round(f.calories)} kcal / {f.reference_amount}{f.reference_unit}
                    </div>
                  </button>
                ))}
              </div>

              {selectedFood && (
                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Quantity</label>
                    <input className="input-field" type="number" min="0.1" step="any" value={logFoodQty} onChange={(e) => setLogFoodQty(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Unit</label>
                    <select className="input-field input-select" value={logFoodUnit} onChange={(e) => handleUnitChange(e.target.value)}>
                      {unitsForFood(selectedFood).map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button className="btn btn-block" type="submit" disabled={foodLogLoading || !selectedFood}>
                {foodLogLoading ? <span className="spinner" /> : null}
                Add food log
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 8 }}
                onClick={() => setShowCustomFood((v) => !v)}
              >
                {showCustomFood ? 'Hide custom form' : 'Add custom food / drink'}
              </button>

              {showCustomFood && (
                <div className="form-stack" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <input className="input-field" placeholder="Name (e.g. Mango Lassi)" value={customFood.name} onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })} required />
                  <select className="input-field input-select" value={customFood.category} onChange={(e) => {
                    const cat = e.target.value;
                    setCustomFood({
                      ...customFood,
                      category: cat,
                      is_drink: cat === 'drink',
                      reference_unit: cat === 'drink' ? 'ml' : customFood.reference_unit,
                    });
                  }}>
                    <option value="food">Food</option>
                    <option value="drink">Drink</option>
                    <option value="snack">Snack</option>
                    <option value="condiment">Condiment</option>
                    <option value="supplement">Supplement</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">Calories</label>
                      <input className="input-field" type="number" value={customFood.calories} onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Protein (g)</label>
                      <input className="input-field" type="number" value={customFood.protein} onChange={(e) => setCustomFood({ ...customFood, protein: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Carbs (g)</label>
                      <input className="input-field" type="number" value={customFood.carbs} onChange={(e) => setCustomFood({ ...customFood, carbs: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Fats (g)</label>
                      <input className="input-field" type="number" value={customFood.fats} onChange={(e) => setCustomFood({ ...customFood, fats: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Serving size</label>
                      <input className="input-field" type="number" value={customFood.reference_amount} onChange={(e) => setCustomFood({ ...customFood, reference_amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Unit</label>
                      <input className="input-field" placeholder="g / ml" value={customFood.reference_unit} onChange={(e) => setCustomFood({ ...customFood, reference_unit: e.target.value })} />
                    </div>
                  </div>
                  <button type="button" className="btn btn-block" onClick={handleCreateCustomFood}>Save to catalog</button>
                </div>
              )}
            </form>

            <form className="card workout-log-card" onSubmit={handleLogWorkout}>
              <div className="card-header">
                <h3 className="card-title">Workout</h3>
              </div>
              <div className="input-group">
                <label className="input-label">Exercise</label>
                <select className="input-field input-select" value={logWorkoutId} onChange={(e) => handleWorkoutChange(e.target.value)}>
                  {availableWorkouts.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.unit})</option>
                  ))}
                </select>
              </div>
              {availableWorkouts.find((w) => w.id === logWorkoutId)?.unit === 'reps' ? (
                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Sets</label>
                    <input className="input-field" type="number" min="1" value={logWorkoutSets} onChange={(e) => setLogWorkoutSets(e.target.value === '' ? '' : parseInt(e.target.value))} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Reps per set</label>
                    <input className="input-field" type="number" min="1" value={logWorkoutReps} onChange={(e) => setLogWorkoutReps(e.target.value === '' ? '' : parseInt(e.target.value))} />
                  </div>
                </div>
              ) : (
                <div className="input-group">
                  <label className="input-label">Duration (minutes)</label>
                  <input className="input-field" type="number" min="1" value={logWorkoutMins} onChange={(e) => setLogWorkoutMins(e.target.value === '' ? '' : parseInt(e.target.value))} />
                </div>
              )}
              <button className="btn btn-cyan btn-block" type="submit" disabled={workoutLogLoading}>
                {workoutLogLoading ? <span className="spinner" /> : null}
                Add workout log
              </button>
            </form>

            {/* Meal scan */}
            <div className="card scan-meal-card">
              <div className="card-header">
                <h3 className="card-title">
                  <Camera size={18} style={{ color: 'var(--warning)' }} /> Scan meal
                </h3>
              </div>
              <p className="empty-hint" style={{ marginBottom: 12 }}>
                Photograph your plate — AI identifies items so you can confirm and log.
              </p>
              <input
                ref={scanInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleScanFile}
              />
              <button
                type="button"
                className="btn btn-orange scan-meal-btn btn-block"
                disabled={scanLoading}
                onClick={() => scanInputRef.current?.click()}
              >
                {scanLoading ? <span className="spinner" /> : <Camera size={18} />}
                {scanLoading ? 'Identifying…' : 'Open camera / gallery'}
              </button>
              {scanPreview && (
                <img src={scanPreview} alt="Meal preview" className="scan-preview" />
              )}
              {scanResult && (
                <div className="scan-results" style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Suggested: {scanResult.meal_suggestion || 'Meal'} · ~{Math.round(scanResult.total_calories || 0)} kcal
                  </p>
                  {scanResult.notes && (
                    <p className="empty-hint" style={{ marginBottom: 8 }}>{scanResult.notes}</p>
                  )}
                  {scanResult.items.map((it, idx) => (
                    <div key={idx} className="scan-item-row">
                      <div>
                        <input
                          className="input-field"
                          style={{ marginBottom: 6, fontSize: 13 }}
                          value={it.name}
                          onChange={(e) => updateScanItem(idx, { name: e.target.value })}
                        />
                        <div className="scan-item-controls">
                          <input
                            className="input-field"
                            type="number"
                            value={it.estimated_quantity}
                            onChange={(e) => updateScanItem(idx, { estimated_quantity: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                          />
                          <span className="scan-item-unit">{it.unit}</span>
                          <span className="scan-item-meta">
                            {Math.round(it.confidence * 100)}% · {Math.round(it.calories)} kcal
                            {it.created ? ' · new' : ''}
                          </span>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeScanItem(idx)}>
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-block" style={{ marginTop: 12 }} disabled={scanLoading || !scanResult.items.length} onClick={handleConfirmScan}>
                    Log all items
                  </button>
                  <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 8 }} onClick={() => { setScanResult(null); setScanPreview(null); }}>
                    Discard
                  </button>
                </div>
              )}
            </div>

            <div className="card recent-logs-card">
              <div className="card-header">
                <h3 className="card-title">Today’s logs</h3>
              </div>
              {foodLogs.length === 0 && workoutLogs.length === 0 ? (
                <p className="empty-hint">Nothing logged yet. Scan a meal or search the catalog.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {foodLogs.length > 0 && (
                    <div>
                      <p className="log-section-label" style={{ color: 'var(--color-emerald)' }}>Food</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {foodLogs.map((log) => (
                          <div key={log.id} className="log-row">
                            <div>
                              <p className="log-row-title">{log.food_name}</p>
                              <p className="log-row-meta">
                                {log.quantity} {log.unit}{log.meal_name ? ` · ${log.meal_name}` : ''}
                              </p>
                            </div>
                            <div className="log-row-actions">
                              <span className="log-row-kcal" style={{ color: 'var(--color-emerald)' }}>+{Math.round(log.calories)} kcal</span>
                              <button className="btn-ghost" onClick={() => handleDeleteFoodLog(log.id)} title="Delete log">
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {workoutLogs.length > 0 && (
                    <div>
                      <p className="log-section-label" style={{ color: 'var(--color-cyan)' }}>Workouts</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {workoutLogs.map((log) => (
                          <div key={log.id} className="log-row">
                            <div>
                              <p className="log-row-title">{log.workout_name}</p>
                              <p className="log-row-meta">
                                {log.duration_minutes ? `${log.duration_minutes} mins` : `${log.sets} sets × ${log.reps_per_set} reps`}
                              </p>
                            </div>
                            <div className="log-row-actions">
                              <span className="log-row-kcal" style={{ color: 'var(--color-cyan)' }}>−{Math.round(log.estimated_calories)} kcal</span>
                              <button className="btn-ghost" onClick={() => handleDeleteWorkoutLog(log.id)} title="Delete log">
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {screen === 'plans' && (
          <div className="screen-content has-nav plans-screen animate-slide-up">
            <div className="screen-header">
              <h2>Health plan</h2>
              <p className="screen-subtitle">Meals and workouts reviewed by the safety critic.</p>
            </div>
            {activePlan ? (
              <>
                <div className="plans-layout-grid">
                  <div className="plans-col-left" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="card">
                      <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', margin: 0 }}>{activePlan.name}</h3>
                    </div>
                    {activePlan.avoidance_list && activePlan.avoidance_list.length > 0 && (
                      <div className="card safety-card">
                        <h4 className="plan-section-title" style={{ color: 'var(--danger)', borderColor: 'rgba(239,107,107,0.2)' }}>
                          <AlertTriangle size={15} /> Safety restrictions
                        </h4>
                        <ul className="plan-list">
                          {activePlan.avoidance_list.map((item, idx) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {activePlan.budget_tips && activePlan.budget_tips.length > 0 && (
                      <div className="card">
                        <h4 className="plan-section-title" style={{ color: 'var(--accent)' }}>
                          <TrendingUp size={15} /> Budget tips
                        </h4>
                        <ul className="plan-list">
                          {activePlan.budget_tips.map((tip, idx) => <li key={idx}>{tip}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="card">
                      <h4 className="plan-section-title" style={{ color: 'var(--color-cyan)' }}>Workout</h4>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 8px' }}>Focus: {activePlan.workout_plan?.focus_area}</p>
                      <ul className="plan-list">
                        {activePlan.workout_plan?.exercises?.map((ex, idx) => (
                          <li key={idx}>{ex.name}: {ex.sets} sets × {ex.reps}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="plans-col-right" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="card">
                      <h4 className="plan-section-title" style={{ color: 'var(--color-emerald)' }}>Meals</h4>
                      <div>
                        {activePlan.days && activePlan.days.length > 0 ? (
                          activePlan.days[0].meals.map((meal, idx) => (
                            <div key={idx} className="meal-block">
                              <p className="meal-block-title">{meal.meal}</p>
                              <ul className="plan-list">
                                {meal.items.map((it, i) => (
                                  <li key={i}>{it.food_name}: {it.quantity} {it.unit}</li>
                                ))}
                              </ul>
                            </div>
                          ))
                        ) : (
                          <p className="empty-hint">No meals generated.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card plan-gen-box" style={{ marginTop: 4 }}>
                  <h4 className="card-title" style={{ margin: 0 }}>
                    <Brain size={16} style={{ color: 'var(--accent)' }} /> Regenerate with notes
                  </h4>
                  <textarea
                    className="input-field"
                    placeholder="What should change? e.g. more abs, low carb"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={1}
                  />
                  <button className="btn btn-accent" onClick={handleGeneratePlan} disabled={genLoading}>
                    {genLoading ? <><span className="spinner" /> Regenerating…</> : 'Regenerate plan'}
                  </button>
                  {genLoading && genStatusMsg && (
                    <p className="status-msg">{genStatusMsg}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="card empty-state-card">
                <div className="empty-state-icon">
                  <Compass size={22} />
                </div>
                <div className="empty-state-text">
                  <p className="empty-state-title">No plan yet</p>
                  <p className="empty-state-desc">Get a daily meal + workout plan built for your goals.</p>
                </div>
                <button className="btn btn-accent" onClick={handleGeneratePlan} disabled={genLoading}>
                  {genLoading ? <><span className="spinner" /> Building…</> : 'Generate plan'}
                </button>
                {genStatusMsg && <p className="status-msg">{genStatusMsg}</p>}
              </div>
            )}
          </div>
        )}

        {screen === 'profile' && (
          <div className="screen-content onboarding-screen animate-slide-up" style={{ paddingBottom: 80 }}>
            <div className="screen-header">
              <h2>Profile</h2>
              <p className="screen-subtitle">Update goals, diet filters, and personal details.</p>
            </div>
            <form className="card form-stack" onSubmit={handleProfileSubmit} style={{ maxWidth: 600, margin: '8px auto', width: '100%' }}>
              <div className="input-group">
                <label className="input-label">Full name</label>
                <input className="input-field" type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Age</label>
                  <input className="input-field" type="number" min="1" max="120" value={profileAge} onChange={(e) => setProfileAge(e.target.value === '' ? '' : parseInt(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Gender</label>
                  <select className="input-field input-select" value={profileGender} onChange={(e) => setProfileGender(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Height (cm)</label>
                  <input className="input-field" type="number" value={profileHeight} onChange={(e) => setProfileHeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Weight (kg)</label>
                  <input className="input-field" type="number" value={profileWeight} onChange={(e) => setProfileWeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Target weight (kg)</label>
                <input className="input-field" type="number" value={profileTargetWeight} onChange={(e) => setProfileTargetWeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Diet</label>
                <div className="choices-grid cols-3">
                  <div className={`choice-chip compact ${profileDiet.includes('veg') ? 'selected' : ''}`} onClick={() => setProfileDiet(['veg'])}>
                    <span className="choice-title">Vegetarian</span>
                    <span className="choice-desc">Plant + dairy/eggs</span>
                  </div>
                  <div className={`choice-chip compact ${profileDiet.includes('vegan') ? 'selected' : ''}`} onClick={() => setProfileDiet(['vegan'])}>
                    <span className="choice-title">Vegan</span>
                    <span className="choice-desc">Fully plant-based</span>
                  </div>
                  <div className={`choice-chip compact ${profileDiet.includes('non-veg') ? 'selected' : ''}`} onClick={() => setProfileDiet(['non-veg'])}>
                    <span className="choice-title">Non-veg</span>
                    <span className="choice-desc">Meat & fish OK</span>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Fitness goal</label>
                <div className="choices-grid cols-3">
                  <div className={`choice-chip ${profileGoal === 'weight loss' ? 'selected' : ''}`} onClick={() => setProfileGoal('weight loss')}>
                    <span className="choice-title">Lose weight</span>
                    <span className="choice-desc">Deficit focus</span>
                  </div>
                  <div className={`choice-chip ${profileGoal === 'weight gain' ? 'selected' : ''}`} onClick={() => setProfileGoal('weight gain')}>
                    <span className="choice-title">Build muscle</span>
                    <span className="choice-desc">Surplus + strength</span>
                  </div>
                  <div className={`choice-chip ${profileGoal === 'maintain healthy' ? 'selected' : ''}`} onClick={() => setProfileGoal('maintain healthy')}>
                    <span className="choice-title">Maintain</span>
                    <span className="choice-desc">Balanced habits</span>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Allergies</label>
                <input className="input-field" type="text" placeholder="Peanuts, dairy, gluten — or None" value={profileAllergies} onChange={(e) => setProfileAllergies(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Food budget</label>
                <div className="choices-grid cols-3">
                  <div className={`choice-chip compact ${profileBudget === 'Low' ? 'selected' : ''}`} onClick={() => setProfileBudget('Low')}>
                    <span className="choice-title">Budget</span>
                    <span className="choice-desc">Affordable staples</span>
                  </div>
                  <div className={`choice-chip compact ${profileBudget === 'Standard' ? 'selected' : ''}`} onClick={() => setProfileBudget('Standard')}>
                    <span className="choice-title">Standard</span>
                    <span className="choice-desc">Everyday variety</span>
                  </div>
                  <div className={`choice-chip compact ${profileBudget === 'Premium' ? 'selected' : ''}`} onClick={() => setProfileBudget('Premium')}>
                    <span className="choice-title">Premium</span>
                    <span className="choice-desc">Organic / specialty</span>
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 8 }}>
                <button className="btn btn-secondary" type="button" style={{ flex: 1 }} onClick={() => setScreen('dashboard')}>
                  Cancel
                </button>
                <button className="btn btn-emerald" type="submit" style={{ flex: 1 }} disabled={profileLoading}>
                  {profileLoading ? <span className="spinner" /> : <UserCheck size={18} />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        )}

        {screen === 'chat' && (
          <div className="chat-window">
            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-action-circle"
                onClick={handleCreateNewSession}
                title="New Chat"
              >
                <Plus size={18} />
              </button>
              <button
                type="button"
                id="past-chats-toggle-btn"
                className={`chat-action-circle ${showHistoryOverlay ? 'active' : ''}`}
                onClick={() => setShowHistoryOverlay(!showHistoryOverlay)}
                title="Past Conversations"
              >
                <History size={18} />
              </button>
            </div>

            {showHistoryOverlay && (
              <div className="chat-history-overlay" ref={historyOverlayRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--panel-border)' }}>
                  <span style={{ fontWeight: 650, fontSize: 14 }}>Chat history</span>
                  <button type="button" className="btn-ghost" onClick={() => setShowHistoryOverlay(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="history-scroll-list">
                  {chatSessions.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No past chats</div>
                  ) : (
                    chatSessions.map((s) => (
                      <div
                        key={s.id}
                        className={`history-item ${activeSessionId === s.id ? 'active' : ''}`}
                        onClick={() => { handleSelectSession(s.id); setShowHistoryOverlay(false); }}
                      >
                        <span className="history-item-title">
                          {s.title}
                        </span>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                          title="Delete Chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <div className="chat-bubble ai">
                  <div className="chat-bubble-content">
                    {renderMarkdown('Hi! I am your SmartSprout Wellness Coach. Log water, steps, any food or drink — or send a meal photo and I will identify it.')}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                    {(msg.image_preview || msg.imagePreview) && (
                      <img
                        src={msg.image_preview || msg.imagePreview}
                        alt="Attached meal"
                        className="chat-bubble-img"
                      />
                    )}
                    <div className="chat-bubble-content">
                      {renderMarkdown(msg.content)}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="chat-bubble ai thinking">Thinking…</div>
              )}
              <div ref={chatEndRef} />
            </div>

            {chatImagePreview && (
              <div className="chat-attach-preview">
                <img src={chatImagePreview} alt="attach" />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setChatImageFile(null); setChatImagePreview(null); }}>
                  <X size={14} />
                </button>
              </div>
            )}

            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <input
                ref={chatImageRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setChatImageFile(f);
                  setChatImagePreview(URL.createObjectURL(f));
                }}
              />
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => chatImageRef.current?.click()} title="Attach meal photo">
                <Camera size={18} />
              </button>
              <input
                className="input-field"
                style={{ flex: 1, marginBottom: 0 }}
                type="text"
                placeholder="Log food, water, or ask anything…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button className="btn btn-icon" type="submit" disabled={chatLoading}>
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>

      {token && ['dashboard', 'logs', 'chat', 'plans', 'profile'].includes(screen) && (
        <div className="bottom-nav">
          <div className={`nav-item ${screen === 'dashboard' ? 'active' : ''}`} onClick={() => setScreen('dashboard')}>
            <Activity size={22} /><span>Dashboard</span>
          </div>
          <div className={`nav-item ${screen === 'logs' ? 'active' : ''}`} onClick={() => setScreen('logs')}>
            <PlusCircle size={22} /><span>Log</span>
          </div>
          <div className={`nav-item ${screen === 'chat' ? 'active' : ''}`} onClick={() => setScreen('chat')}>
            <MessageSquare size={22} /><span>AI Coach</span>
          </div>
          <div className={`nav-item ${screen === 'plans' ? 'active' : ''}`} onClick={() => setScreen('plans')}>
            <Compass size={22} /><span>Plan</span>
          </div>
        </div>
      )}
    </div>
  );
}
