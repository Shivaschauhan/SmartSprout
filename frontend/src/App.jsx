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
  const strokeDash = 2 * Math.PI * 70;
  const progressRatio = Math.min(todayCaloriesIn / calorieTarget, 1);
  const strokeOffset = strokeDash - progressRatio * strokeDash;

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
            <div className="sidebar-user" onClick={() => setScreen('profile')} style={{ cursor: 'pointer' }}>
              <UserIcon size={18} style={{ color: 'var(--color-emerald)' }} />
              <span className="sidebar-user-name" title={user?.email} style={{ fontWeight: screen === 'profile' ? '600' : 'normal', color: screen === 'profile' ? 'var(--color-emerald)' : 'inherit' }}>{user?.name || 'User'}</span>
            </div>
            <button className="sidebar-btn-logout" onClick={handleLogout}>
              <LogOut size={16} /><span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <div className="main-content-wrapper">
        {token && (
          <div className="header-bar">
            <div className="header-title" onClick={() => setScreen('dashboard')} style={{ cursor: 'pointer' }}>SmartSprout</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn btn-secondary" style={{ padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', border: screen === 'profile' ? '1px solid var(--color-emerald)' : '1px solid var(--panel-border)', background: screen === 'profile' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)' }} onClick={() => setScreen('profile')} title="Profile">
                <UserIcon size={16} style={{ color: 'var(--color-emerald)' }} />
                <span className="profile-btn-txt" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Profile'}</span>
              </button>
              <button className="btn btn-secondary" style={{ padding: '8px 12px', borderRadius: '10px' }} onClick={handleLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        {screen === 'login' && (
          <div className="screen-content auth-screen animate-slide-up">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '24px', color: 'var(--color-emerald)', marginBottom: '16px' }}>
                <Brain size={48} className="pulse-glow" style={{ borderRadius: '50%' }} />
              </div>
              <h2>Welcome to SmartSprout</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Advanced Agentic Health & Nutrition</p>
            </div>
            <form className="card" onSubmit={handleLogin}>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input-field" type="email" placeholder="you@domain.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input-field" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {errorMsg && <p style={{ color: 'red', fontSize: '13px', marginBottom: '12px' }}>{errorMsg}</p>}
              <button className="btn" type="submit" style={{ width: '100%' }} disabled={loginLoading}>
                {loginLoading ? <span className="spinner" style={{ marginRight: '8px' }} /> : null}
                Login
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
              New to SmartSprout?{' '}
              <span style={{ color: 'var(--color-emerald)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setScreen('register')}> Register</span>
            </p>
          </div>
        )}

        {screen === 'register' && (
          <div className="screen-content auth-screen animate-slide-up">
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2>Create Account</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Start your sustainable AI health path</p>
            </div>
            <form className="card" onSubmit={handleRegister}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input-field" type="text" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input className="input-field" type="email" placeholder="john@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input className="input-field" type="password" placeholder="Min. 8 characters" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {errorMsg && <p style={{ color: 'red', fontSize: '13px', marginBottom: '12px' }}>{errorMsg}</p>}
              <button className="btn" type="submit" style={{ width: '100%' }} disabled={registerLoading}>
                {registerLoading ? <span className="spinner" style={{ marginRight: '8px' }} /> : null}
                Register
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <span style={{ color: 'var(--color-emerald)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setScreen('login')}> Sign In</span>
            </p>
          </div>
        )}

        {screen === 'onboarding' && (
          <div className="screen-content onboarding-screen animate-slide-up">
            <div>
              <h2>Let's Personalize</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Configure your SmartSprout agentic settings</p>
            </div>
            <form className="card" onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Age</label>
                  <input className="input-field" type="number" min="1" max="120" value={onboardAge} onChange={(e) => setOnboardAge(e.target.value === '' ? '' : parseInt(e.target.value))} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Gender</label>
                  <select className="input-field input-select" value={onboardGender} onChange={(e) => setOnboardGender(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Height (cm)</label>
                  <input className="input-field" type="number" value={onboardHeight} onChange={(e) => setOnboardHeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Weight (kg)</label>
                  <input className="input-field" type="number" value={onboardWeight} onChange={(e) => setOnboardWeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Dietary Preference</label>
                <div className="choices-grid">
                  <div className={`choice-chip ${onboardDiet.includes('veg') ? 'selected' : ''}`} onClick={() => setOnboardDiet(['veg'])}>Vegetarian</div>
                  <div className={`choice-chip ${onboardDiet.includes('vegan') ? 'selected' : ''}`} onClick={() => setOnboardDiet(['vegan'])}>Vegan</div>
                  <div className={`choice-chip ${onboardDiet.includes('non-veg') ? 'selected' : ''}`} onClick={() => setOnboardDiet(['non-veg'])}>Non-Vegetarian</div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Goal</label>
                <select className="input-field input-select" value={onboardGoal} onChange={(e) => setOnboardGoal(e.target.value)}>
                  <option value="weight loss">Weight Loss (Deficit)</option>
                  <option value="weight gain">Muscle Gain (Surplus)</option>
                  <option value="maintain healthy">Healthy Maintenance</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Allergies (comma-separated)</label>
                <input className="input-field" type="text" placeholder="e.g. peanuts, dairy, gluten or None" value={onboardAllergies} onChange={(e) => setOnboardAllergies(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Weekly Budget Limit</label>
                <select className="input-field input-select" value={onboardBudget} onChange={(e) => setOnboardBudget(e.target.value)}>
                  <option value="Low">Low Cost (Affordable)</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium / Organic</option>
                </select>
              </div>
              {errorMsg && <p style={{ color: 'red', fontSize: '13px' }}>{errorMsg}</p>}
              <button className="btn" type="submit" style={{ marginTop: '8px' }} disabled={onboardLoading}>
                {onboardLoading ? <span className="spinner" style={{ marginRight: '8px' }} /> : <UserCheck size={18} style={{ marginRight: '8px' }} />}
                Complete Onboarding
              </button>
            </form>
          </div>
        )}

        {screen === 'dashboard' && (
          <div className="screen-content has-nav dashboard-screen animate-slide-up">
            <div className="card calorie-card" style={{ textAlign: 'center', position: 'relative' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Calorie Balance</h3>
              <div className="circular-progress-container">
                <svg className="circular-progress" viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <circle className="circle-bg" cx="80" cy="80" r="70" />
                  <circle className="circle-fg" cx="80" cy="80" r="70" strokeDasharray={strokeDash} strokeDashoffset={strokeOffset} />
                </svg>
                <div className="circle-text-center">
                  <span className="circle-val">{Math.round(todayCaloriesIn)}</span>
                  <span className="circle-unit">of {calorieTarget} kcal</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>ACTIVE BURNED</p>
                  <p style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <Flame size={14} /> {Math.round(todayCaloriesOut)} kcal
                  </p>
                </div>
                <div style={{ width: '1px', background: 'var(--panel-border)' }} />
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>BUDGET STYLE</p>
                  <p style={{ fontWeight: 700, color: 'var(--color-purple)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <IndianRupee size={14} /> {user?.budget || 'Standard'}
                  </p>
                </div>
              </div>
            </div>

            <div className="logs-grid dashboard-logs-grid">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-cyan)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Droplet size={20} /><span style={{ fontWeight: 700, fontSize: '15px' }}>Hydration</span>
                  </div>
                  {todayWater > 0 && (
                    <button onClick={handleResetWater} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }} title="Reset today's water">
                      <X size={16} style={{ color: 'var(--color-orange)' }} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>{todayWater} <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ml</span></div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', flex: 1 }} onClick={() => handleAddWater(250)}>+250</button>
                  <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', flex: 1 }} onClick={() => handleAddWater(500)}>+500</button>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-emerald)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Footprints size={20} /><span style={{ fontWeight: 700, fontSize: '15px' }}>Steps</span>
                  </div>
                  {todaySteps > 0 && (
                    <button onClick={handleResetSteps} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }} title="Reset today's steps">
                      <X size={16} style={{ color: 'var(--color-orange)' }} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>{todaySteps} <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>steps</span></div>
                <button className="btn" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => {
                  const num = prompt('Enter steps walked:');
                  if (num) handleAddSteps(parseInt(num));
                }}>
                  <Plus size={14} /> Add steps
                </button>
              </div>
            </div>

            <div className="card active-plan-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={18} style={{ color: 'var(--color-purple)' }} /> Active AI Health Plan
                </h3>
                {!activePlan && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
                    <textarea
                      className="input-field"
                      placeholder="Add custom plan notes (e.g. 'Focus on core strength', 'Include eggs for breakfast', 'Keto today')"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={2}
                      style={{ resize: 'none', fontSize: '12px', padding: '8px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button className="btn btn-purple" style={{ padding: '8px 12px', fontSize: '12px', width: '100%' }} onClick={handleGeneratePlan} disabled={genLoading}>
                      {genLoading ? <><span className="spinner" style={{ marginRight: '6px', width: '12px', height: '12px', borderWidth: '0.15em' }} />Building…</> : 'Generate Plan'}
                    </button>
                  </div>
                )}
              </div>
              {genLoading && genStatusMsg && (
                <p style={{ fontSize: '12px', color: 'var(--color-purple)' }}>{genStatusMsg}</p>
              )}
              {activePlan ? (
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-purple)', fontSize: '14px', marginBottom: '4px' }}>{activePlan.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Workout Target: {activePlan.workout_plan?.focus_area}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', width: '100%' }} onClick={() => setScreen('plans')}>
                      View Plan Detail
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Generate a multi-agent meal + workout plan tailored to your goals.
                </p>
              )}
            </div>
          </div>
        )}

        {screen === 'logs' && (
          <div className="screen-content has-nav logs-screen animate-slide-up">
            <h2>Log Activity</h2>

            {/* Food log form */}
            <form className="card food-log-card" onSubmit={handleLogFood}>
              <h3 style={{ fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '16px' }}>Log Nutrition</h3>

              <div className="input-group">
                <label className="input-label">Search foods & drinks</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: '36px' }}
                    type="search"
                    placeholder="Chapati, coffee, protein shake…"
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="category-chips" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id || 'all'}
                    type="button"
                    className={`choice-chip ${foodCategory === c.id ? 'selected' : ''}`}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                    onClick={() => setFoodCategory(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="food-catalog-list" style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {catalogLoading && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</p>}
                {!catalogLoading && catalogFoods.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No matches. Add a custom food/drink below.</p>
                )}
                {catalogFoods.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFood(f)}
                    className={`food-pick-item ${selectedFood?.id === f.id ? 'selected' : ''}`}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: selectedFood?.id === f.id ? '1px solid var(--color-emerald)' : '1px solid var(--panel-border)',
                      background: selectedFood?.id === f.id ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.02)',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{f.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {f.category}{f.is_drink ? ' · drink' : ''} · {Math.round(f.calories)} kcal / {f.reference_amount}{f.reference_unit}
                    </div>
                  </button>
                ))}
              </div>

              {selectedFood && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Quantity</label>
                    <input className="input-field" type="number" min="0.1" step="any" value={logFoodQty} onChange={(e) => setLogFoodQty(e.target.value)} />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Unit</label>
                    <select className="input-field input-select" value={logFoodUnit} onChange={(e) => handleUnitChange(e.target.value)}>
                      {unitsForFood(selectedFood).map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button className="btn" type="submit" style={{ width: '100%' }} disabled={foodLogLoading || !selectedFood}>
                {foodLogLoading ? <span className="spinner" style={{ marginRight: '8px' }} /> : null}
                Add Food Log
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '8px' }}
                onClick={() => setShowCustomFood((v) => !v)}
              >
                {showCustomFood ? 'Hide custom form' : 'Add custom food / drink'}
              </button>

              {showCustomFood && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '4px' }}>Calories (kcal)</label>
                      <input className="input-field" type="number" placeholder="Calories" value={customFood.calories} onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '4px' }}>Protein (g)</label>
                      <input className="input-field" type="number" placeholder="Protein g" value={customFood.protein} onChange={(e) => setCustomFood({ ...customFood, protein: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '4px' }}>Carbs (g)</label>
                      <input className="input-field" type="number" placeholder="Carbs g" value={customFood.carbs} onChange={(e) => setCustomFood({ ...customFood, carbs: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '4px' }}>Fats (g)</label>
                      <input className="input-field" type="number" placeholder="Fats g" value={customFood.fats} onChange={(e) => setCustomFood({ ...customFood, fats: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '4px' }}>Serving Size</label>
                      <input className="input-field" type="number" placeholder="Ref amount" value={customFood.reference_amount} onChange={(e) => setCustomFood({ ...customFood, reference_amount: e.target.value === '' ? '' : parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '4px' }}>Serving Unit</label>
                      <input className="input-field" placeholder="Unit (g/ml)" value={customFood.reference_unit} onChange={(e) => setCustomFood({ ...customFood, reference_unit: e.target.value })} />
                    </div>
                  </div>
                  <button type="button" className="btn" onClick={handleCreateCustomFood}>Save to catalog</button>
                </div>
              )}
            </form>

            <form className="card workout-log-card" onSubmit={handleLogWorkout}>
              <h3 style={{ fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '16px' }}>Log Exercises</h3>
              <div className="input-group">
                <label className="input-label">Workout Type</label>
                <select className="input-field input-select" value={logWorkoutId} onChange={(e) => handleWorkoutChange(e.target.value)}>
                  {availableWorkouts.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.unit})</option>
                  ))}
                </select>
              </div>
              {availableWorkouts.find((w) => w.id === logWorkoutId)?.unit === 'reps' ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Sets</label>
                    <input className="input-field" type="number" min="1" value={logWorkoutSets} onChange={(e) => setLogWorkoutSets(e.target.value === '' ? '' : parseInt(e.target.value))} />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
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
              <button className="btn btn-cyan" type="submit" style={{ width: '100%' }} disabled={workoutLogLoading}>
                {workoutLogLoading ? <span className="spinner" style={{ marginRight: '8px' }} /> : null}
                Add Workout Log
              </button>
            </form>

            {/* Meal scan */}
            <div className="card scan-meal-card">
              <h3 style={{ fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} style={{ color: 'var(--color-orange)' }} /> Scan Meal Photo
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Take a photo of your plate or drink on mobile — AI identifies items so you can log the meal.
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
                className="btn btn-orange scan-meal-btn"
                style={{ width: '100%', minHeight: '48px' }}
                disabled={scanLoading}
                onClick={() => scanInputRef.current?.click()}
              >
                {scanLoading ? <span className="spinner" style={{ marginRight: '8px' }} /> : <Camera size={18} style={{ marginRight: '8px' }} />}
                {scanLoading ? 'Identifying…' : 'Open Camera / Gallery'}
              </button>
              {scanPreview && (
                <img src={scanPreview} alt="Meal preview" className="scan-preview" />
              )}
              {scanResult && (
                <div className="scan-results" style={{ marginTop: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    Suggested: {scanResult.meal_suggestion || 'Meal'} · ~{Math.round(scanResult.total_calories || 0)} kcal
                  </p>
                  {scanResult.notes && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{scanResult.notes}</p>
                  )}
                  {scanResult.items.map((it, idx) => (
                    <div key={idx} className="scan-item-row">
                      <div style={{ flex: 1 }}>
                        <input
                          className="input-field"
                          style={{ marginBottom: '6px', fontSize: '13px' }}
                          value={it.name}
                          onChange={(e) => updateScanItem(idx, { name: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            className="input-field"
                            type="number"
                            style={{ width: '80px', fontSize: '13px' }}
                            value={it.estimated_quantity}
                            onChange={(e) => updateScanItem(idx, { estimated_quantity: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{it.unit}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {Math.round(it.confidence * 100)}% · {Math.round(it.calories)} kcal
                            {it.created ? ' · new' : ''}
                          </span>
                          <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => removeScanItem(idx)}>
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn" style={{ width: '100%', marginTop: '12px' }} disabled={scanLoading || !scanResult.items.length} onClick={handleConfirmScan}>
                    Log All Items
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => { setScanResult(null); setScanPreview(null); }}>
                    Discard
                  </button>
                </div>
              )}
            </div>

            <div className="card recent-logs-card">
              <h3 style={{ fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', marginBottom: '12px' }}>Today's Logs</h3>
              {foodLogs.length === 0 && workoutLogs.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No items logged yet. Scan a meal or search the catalog!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {foodLogs.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '13px', color: 'var(--color-emerald)', marginBottom: '8px' }}>Food Logs</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {foodLogs.map((log) => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{log.food_name}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                {log.quantity} {log.unit}{log.meal_name ? ` · ${log.meal_name}` : ''}
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-emerald)' }}>+{Math.round(log.calories)} kcal</span>
                              <button onClick={() => handleDeleteFoodLog(log.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Delete log">
                                <X size={16} style={{ color: 'var(--color-orange)' }} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {workoutLogs.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '13px', color: 'var(--color-cyan)', marginBottom: '8px' }}>Workout Logs</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {workoutLogs.map((log) => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{log.workout_name}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                {log.duration_minutes ? `${log.duration_minutes} mins` : `${log.sets} sets x ${log.reps_per_set} reps`}
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-cyan)' }}>-{Math.round(log.estimated_calories)} kcal</span>
                              <button onClick={() => handleDeleteWorkoutLog(log.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Delete log">
                                <X size={16} style={{ color: 'var(--color-orange)' }} />
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
            <h2>Health Plan</h2>
            {activePlan ? (
              <>
                <div className="plans-layout-grid">
                <div className="plans-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="card">
                    <h3 style={{ color: 'var(--color-purple)', fontSize: '18px', margin: 0 }}>{activePlan.name}</h3>
                  </div>
                  {activePlan.avoidance_list && activePlan.avoidance_list.length > 0 && (
                    <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '14px', margin: '0 0 8px 0' }}>
                        <AlertTriangle size={16} /> SAFETY RESTRICTIONS
                      </h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px' }}>
                        {activePlan.avoidance_list.map((item, idx) => <li key={idx}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {activePlan.budget_tips && activePlan.budget_tips.length > 0 && (
                    <div className="card">
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-purple)', fontSize: '14px', margin: '0 0 8px 0' }}>
                        <TrendingUp size={16} /> SUSTAINABLE BUDGET TIPS
                      </h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {activePlan.budget_tips.map((tip, idx) => <li key={idx}>{tip}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="card">
                    <h4 style={{ fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', color: 'var(--color-cyan)' }}>WORKOUT PLAN</h4>
                    <div style={{ textAlign: 'left', marginTop: '12px' }}>
                      <p style={{ fontWeight: 700, fontSize: '14px' }}>Focus: {activePlan.workout_plan?.focus_area}</p>
                      <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {activePlan.workout_plan?.exercises?.map((ex, idx) => (
                          <li key={idx}>{ex.name}: {ex.sets} sets x {ex.reps}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="plans-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="card">
                    <h4 style={{ fontSize: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', color: 'var(--color-emerald)' }}>MEAL PLAN</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                      {activePlan.days && activePlan.days.length > 0 ? (
                        activePlan.days[0].meals.map((meal, idx) => (
                          <div key={idx} style={{ textAlign: 'left' }}>
                            <p style={{ fontWeight: 700, fontSize: '14px' }}>{meal.meal}</p>
                            <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {meal.items.map((it, i) => (
                                <li key={i}>{it.food_name}: {it.quantity} {it.unit}</li>
                              ))}
                            </ul>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No meals generated.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--color-purple)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={16} /> Regenerate Health Plan with Custom Instructions
                </h4>
                <textarea
                  className="input-field"
                  placeholder="Optional: Tell the AI what to change (e.g. 'Focus on abs', 'Make it low carb', 'Add eggs for breakfast')"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={2}
                  style={{ resize: 'none', fontSize: '12px', padding: '8px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}
                />
                <button className="btn btn-purple" onClick={handleGeneratePlan} disabled={genLoading} style={{ padding: '12px', width: '100%', fontSize: '13px', fontWeight: 'bold' }}>
                  {genLoading ? <><span className="spinner" style={{ marginRight: '6px', width: '12px', height: '12px', borderWidth: '0.15em' }} />Regenerating…</> : 'Regenerate Plan'}
                </button>
                {genLoading && genStatusMsg && (
                  <p style={{ fontSize: '12px', color: 'var(--color-purple)', textAlign: 'center', margin: 0 }}>{genStatusMsg}</p>
                )}
              </div>
            </>
          ) : (
              <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>No active plan yet.</p>
                {genStatusMsg && <p style={{ fontSize: '12px', color: 'var(--color-purple)', marginBottom: '12px' }}>{genStatusMsg}</p>}
                <button className="btn btn-purple" style={{ margin: '0 auto' }} onClick={handleGeneratePlan} disabled={genLoading}>
                  {genLoading ? <><span className="spinner" style={{ marginRight: '8px' }} />Building…</> : 'Generate New Plan'}
                </button>
              </div>
            )}
          </div>
        )}

        {screen === 'profile' && (
          <div className="screen-content onboarding-screen animate-slide-up" style={{ paddingBottom: '80px' }}>
            <div>
              <h2>Edit Profile</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Update your personal profile, goals, and nutrition filters</p>
            </div>
            <form className="card" onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '20px auto' }}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input-field" type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Age</label>
                  <input className="input-field" type="number" min="1" max="120" value={profileAge} onChange={(e) => setProfileAge(e.target.value === '' ? '' : parseInt(e.target.value))} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Gender</label>
                  <select className="input-field input-select" value={profileGender} onChange={(e) => setProfileGender(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Height (cm)</label>
                  <input className="input-field" type="number" value={profileHeight} onChange={(e) => setProfileHeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Weight (kg)</label>
                  <input className="input-field" type="number" value={profileWeight} onChange={(e) => setProfileWeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Target Weight (kg)</label>
                <input className="input-field" type="number" value={profileTargetWeight} onChange={(e) => setProfileTargetWeight(e.target.value === '' ? '' : parseFloat(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Dietary Preference</label>
                <div className="choices-grid">
                  <div className={`choice-chip ${profileDiet.includes('veg') ? 'selected' : ''}`} onClick={() => setProfileDiet(['veg'])}>Vegetarian</div>
                  <div className={`choice-chip ${profileDiet.includes('vegan') ? 'selected' : ''}`} onClick={() => setProfileDiet(['vegan'])}>Vegan</div>
                  <div className={`choice-chip ${profileDiet.includes('non-veg') ? 'selected' : ''}`} onClick={() => setProfileDiet(['non-veg'])}>Non-Vegetarian</div>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Active Fitness Goal</label>
                <select className="input-field input-select" value={profileGoal} onChange={(e) => setProfileGoal(e.target.value)}>
                  <option value="weight loss">Weight Loss (Deficit)</option>
                  <option value="weight gain">Muscle Gain (Surplus)</option>
                  <option value="maintain healthy">Healthy Maintenance</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Allergies (comma-separated)</label>
                <input className="input-field" type="text" placeholder="e.g. peanuts, dairy, gluten or None" value={profileAllergies} onChange={(e) => setProfileAllergies(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Weekly Budget Limit</label>
                <select className="input-field input-select" value={profileBudget} onChange={(e) => setProfileBudget(e.target.value)}>
                  <option value="Low">Low Cost (Affordable)</option>
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium / Organic</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button className="btn btn-secondary" type="button" style={{ flex: 1 }} onClick={() => setScreen('dashboard')}>
                  Cancel
                </button>
                <button className="btn btn-emerald" type="submit" style={{ flex: 1 }} disabled={profileLoading}>
                  {profileLoading ? <span className="spinner" style={{ marginRight: '8px' }} /> : <UserCheck size={18} style={{ marginRight: '8px' }} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {screen === 'chat' && (
          <div className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Top Action Header Bar with circular buttons */}
            <div className="chat-header-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              padding: '12px 20px', 
              borderBottom: '1px solid var(--panel-border)', 
              background: 'rgba(17, 24, 39, 0.4)',
              alignItems: 'center'
            }}>
              <button 
                type="button" 
                className="chat-action-circle" 
                onClick={handleCreateNewSession} 
                title="New Chat" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  border: '1px solid var(--panel-border)', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  color: 'var(--text-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={18} />
              </button>
              
              <button 
                type="button" 
                id="past-chats-toggle-btn"
                className="chat-action-circle" 
                onClick={() => setShowHistoryOverlay(!showHistoryOverlay)} 
                title="Past Conversations" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  border: '1px solid var(--panel-border)', 
                  background: showHistoryOverlay ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                  color: showHistoryOverlay ? 'var(--color-purple)' : 'var(--text-primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s'
                }}
              >
                <History size={18} />
              </button>
            </div>

            {/* Past Conversations overlay dropdown */}
            {showHistoryOverlay && (
              <div className="chat-history-overlay" ref={historyOverlayRef} style={{
                position: 'absolute',
                top: '64px',
                right: '20px',
                width: '300px',
                maxHeight: '360px',
                background: 'var(--panel-color)',
                border: '1px solid var(--panel-border)',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--panel-border)' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Chat History</span>
                  <button type="button" onClick={() => setShowHistoryOverlay(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="history-scroll-list" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {chatSessions.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No past chats found</div>
                  ) : (
                    chatSessions.map((s) => (
                      <div 
                        key={s.id}
                        onClick={() => { handleSelectSession(s.id); setShowHistoryOverlay(false); }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: activeSessionId === s.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          border: activeSessionId === s.id ? '1px solid var(--color-purple)' : '1px solid var(--panel-border)',
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', color: activeSessionId === s.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeSessionId === s.id ? 600 : 400 }}>{s.title}</span>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-orange)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
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

            {/* Chat message bubbles scroll container */}
            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 16px' }}>
              {chatMessages.length === 0 ? (
                <div className="chat-bubble ai" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                  <div style={{ wordBreak: 'break-word' }}>
                    {renderMarkdown('Hi! I am your SmartSprout Wellness Coach. Log water, steps, any food or drink or send a meal photo and I will identify it.')}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(msg.image_preview || msg.imagePreview) && (
                      <img 
                        src={msg.image_preview || msg.imagePreview} 
                        alt="Attached meal" 
                        style={{ 
                          maxWidth: '220px', 
                          maxHeight: '220px', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'block' 
                        }} 
                      />
                    )}
                    <div style={{ wordBreak: 'break-word' }}>
                      {renderMarkdown(msg.content)}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="chat-bubble ai" style={{ opacity: 0.5 }}>Thinking…</div>
              )}
              <div ref={chatEndRef} />
            </div>

            {chatImagePreview && (
              <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={chatImagePreview} alt="attach" style={{ height: 48, borderRadius: 8 }} />
                <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => { setChatImageFile(null); setChatImagePreview(null); }}>
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
              <button type="button" className="btn btn-secondary" style={{ padding: '12px', borderRadius: '12px', minWidth: 44, minHeight: 44 }} onClick={() => chatImageRef.current?.click()} title="Attach meal photo">
                <Camera size={18} />
              </button>
              <input className="input-field" style={{ flex: 1, marginBottom: 0 }} type="text" placeholder="Log food, water, or ask anything…" value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={chatLoading} />
              <button className="btn" type="submit" style={{ padding: '12px', borderRadius: '12px', minWidth: 44, minHeight: 44 }} disabled={chatLoading}>
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
