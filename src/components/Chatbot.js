import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaRobot, FaThumbsUp, FaThumbsDown, FaQuestion, FaListUl, FaAngleRight } from 'react-icons/fa';
import '../styles/chatbot-animations.css';
import qaData from '../data/chatbot_qa.json';
import { messagePatterns, socialMediaCategories } from '../data/chatbot_patterns';

// Add advanced NLP-like utilities
const nlpUtils = {
  stopWords: new Set(['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'on', 'it', 'to', 'for', 'in', 'with', 'how', 
    'what', 'when', 'where', 'why', 'who', 'which', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
    'am', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may',
    'might', 'must', 'shall', 'of', 'by', 'as', 'at', 'from', 'about', 'me', 'my', 'myself', 'our', 'ours', 'ourselves',
    'your', 'yours', 'yourself', 'yourselves', 'their', 'theirs', 'them', 'themselves']),
  
  tokenize: (text) => {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !nlpUtils.stopWords.has(word));
  },
  
  extractKeywords: (text) => {
    const tokens = nlpUtils.tokenize(text);
    if (tokens.length === 0) return [];
    
    const wordFreq = {};
    tokens.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    const maxFreq = Math.max(...Object.values(wordFreq));
    const weighted = Object.entries(wordFreq).map(([word, freq]) => ({
      word,
      weight: freq / maxFreq
    }));
    
    return weighted.sort((a, b) => b.weight - a.weight)
      .slice(0, 10)
      .map(item => item.word);
  },
  
  levenshteinDistance: (str1 = '', str2 = '') => {
    const track = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }
    
    return track[str2.length][str1.length];
  },
  
  levenshteinSimilarity: (str1 = '', str2 = '') => {
    if (!str1.length && !str2.length) return 1.0;
    if (!str1.length || !str2.length) return 0.0;
    
    const distance = nlpUtils.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return (maxLen - distance) / maxLen;
  },
  
  jaccardSimilarity: (tokens1 = [], tokens2 = []) => {
    if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
    if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  },
  
  overlapSimilarity: (tokens1 = [], tokens2 = []) => {
    if (tokens1.length === 0 || tokens2.length === 0) return 0.0;
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const smaller = Math.min(set1.size, set2.size);
    
    return intersection.size / smaller;
  },
  
  getSynonyms: (word) => {
    const synonymMap = {
      'post': ['content', 'update', 'publication', 'share', 'tweet', 'status'],
      'profile': ['account', 'page', 'bio', 'presence'],
      'follower': ['subscriber', 'fan', 'connection', 'contact', 'friend', 'audience'],
      'engagement': ['interaction', 'reach', 'activity', 'response', 'participation'],
      'analytics': ['metrics', 'statistics', 'data', 'insights', 'performance', 'numbers'],
      'comment': ['reply', 'response', 'feedback', 'reaction'],
      'message': ['dm', 'direct message', 'chat', 'mail', 'communication'],
      'hashtag': ['tag', 'label', '#'],
      'trending': ['viral', 'popular', 'hot', 'current', 'buzzing'],
      'dashboard': ['analytics', 'metrics', 'panel', 'overview', 'stats'],
      'media': ['photo', 'video', 'image', 'picture', 'content', 'visual'],
      'algorithm': ['feed', 'formula', 'system', 'ranking', 'sorting'],
      'verification': ['checkmark', 'authenticated', 'verified', 'blue badge', 'official'],
      'shadow ban': ['invisible', 'hidden', 'restricted', 'limited visibility', 'throttled'],
      'notification': ['alert', 'update', 'ping', 'message', 'notice'],
      'report': ['flag', 'alert', 'notify', 'mark', 'submit', 'complaint'],
      'block': ['restrict', 'ban', 'remove', 'prohibit'],
      'private': ['protected', 'personal', 'hidden', 'closed', 'restricted']
    };
    
    const lower = word.toLowerCase();
    return synonymMap[lower] || [];
  },

  expandWithSynonyms: (tokens) => {
    if (!tokens || tokens.length === 0) return [];
    
    const expanded = [...tokens];
    tokens.forEach(token => {
      const synonyms = nlpUtils.getSynonyms(token);
      if (synonyms.length > 0) {
        expanded.push(...synonyms);
      }
    });
    
    return [...new Set(expanded)];
  },
  
  analyzeSentiment: (text) => {
    const positiveWords = new Set([
      'good', 'great', 'awesome', 'excellent', 'amazing', 'wonderful', 'fantastic', 
      'helpful', 'love', 'happy', 'pleased', 'satisfied', 'excited', 'appreciate',
      'thanks', 'thank', 'beautiful', 'perfect', 'better', 'best', 'easy', 'impressive',
      'clear', 'interesting', 'valuable', 'useful', 'effective', 'efficient'
    ]);
    
    const negativeWords = new Set([
      'bad', 'terrible', 'awful', 'horrible', 'poor', 'frustrating', 'annoying',
      'useless', 'difficult', 'hard', 'complicated', 'confusing', 'hate', 'dislike',
      'disappointed', 'disappointing', 'issue', 'problem', 'trouble', 'fail', 'failed',
      'wrong', 'error', 'broken', 'slow', 'stupid', 'waste', 'ineffective', 'unhelpful'
    ]);
    
    const questionIndicators = new Set([
      'how', 'what', 'when', 'where', 'why', 'who', 'which', 'can', 'could', 'would',
      'is', 'are', 'will', 'do', 'does', 'should', '?'
    ]);
    
    const lcText = text.toLowerCase();
    const tokens = lcText.split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    let questionScore = 0;
    
    tokens.forEach(token => {
      const cleanToken = token.replace(/[^\w]/g, '');
      if (positiveWords.has(cleanToken)) positiveScore++;
      if (negativeWords.has(cleanToken)) negativeScore++;
      if (questionIndicators.has(cleanToken)) questionScore++;
    });
    
    if (lcText.includes('?')) questionScore += 2;
    
    const total = positiveScore + negativeScore;
    const compoundScore = total > 0 ? 
      (positiveScore - negativeScore) / total : 0;
    
    let sentiment = 'neutral';
    if (compoundScore > 0.2) sentiment = 'positive';
    else if (compoundScore < -0.2) sentiment = 'negative';
    
    const isQuestion = questionScore >= 1;
    
    return {
      sentiment,
      compoundScore,
      isQuestion,
      positiveScore,
      negativeScore,
      questionScore
    };
  },
  
  detectLanguage: (text) => {
    if (!text || text.length < 10) return 'en';
    
    const languagePatterns = {
      en: /\b(the|and|is|in|to|you|that|it|he|was|for|on|are|as|with|his|they|at)\b/i,
      es: /\b(el|la|de|en|y|a|que|los|se|un|por|las|con|una|del|su|para|es)\b/i,
      fr: /\b(le|la|de|et|un|une|du|des|en|est|que|qui|dans|pour|pas|sur|au|ce)\b/i,
      de: /\b(der|die|und|den|das|von|zu|mit|ein|dem|nicht|eine|ist|auf|für)\b/i,
      pt: /\b(de|a|o|que|e|do|da|em|um|para|é|com|não|uma|os|no|se|na|por)\b/i,
      it: /\b(il|di|che|e|la|in|non|un|per|è|una|sono|mi|si|ho|lo|ha|con)\b/i
    };
    
    const matches = {};
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      const match = text.match(pattern) || [];
      matches[lang] = match.length;
    }
    
    let bestMatch = 'en';
    let highestScore = 0;
    
    for (const [lang, score] of Object.entries(matches)) {
      if (score > highestScore) {
        highestScore = score;
        bestMatch = lang;
      }
    }
    
    return bestMatch;
  },
  
  summarizeConversation: (messages) => {
    if (!messages || messages.length === 0) return { topics: [], entities: {} };
    
    const allText = messages.map(m => m.content || '').join(' ');
    
    const keywords = nlpUtils.extractKeywords(allText);
    
    const entities = {
      platforms: [],
      features: [],
      issues: [],
      actions: []
    };
    
    const platforms = [
      'facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'linkedin', 
      'pinterest', 'reddit', 'snapchat', 'threads'
    ];
    platforms.forEach(platform => {
      if (allText.toLowerCase().includes(platform)) {
        entities.platforms.push(platform);
      }
    });
    
    const features = [
      'post', 'story', 'reel', 'tweet', 'video', 'comment', 'message',
      'follower', 'like', 'share', 'analytics', 'profile'
    ];
    features.forEach(feature => {
      if (allText.toLowerCase().includes(feature)) {
        entities.features.push(feature);
      }
    });
    
    const issues = [
      'problem', 'error', 'bug', 'trouble', 'not working', 'can\'t', 'doesn\'t', 
      'issue', 'broken', 'help', 'question', 'how to'
    ];
    issues.forEach(issue => {
      if (allText.toLowerCase().includes(issue)) {
        entities.issues.push(issue);
      }
    });
    
    const actions = [
      'create', 'update', 'delete', 'edit', 'post', 'share', 'report',
      'block', 'settings', 'configure', 'set up'
    ];
    actions.forEach(action => {
      if (allText.toLowerCase().includes(action)) {
        entities.actions.push(action);
      }
    });
    
    return {
      topics: keywords,
      entities: Object.fromEntries(
        Object.entries(entities).filter(([_, v]) => v.length > 0)
      )
    };
  },
  
  detectMultiIntent: (text) => {
    if (!text) return { hasMultipleIntents: false, intents: [] };
    
    const conjunctionPatterns = [
      /\band\b|\balso\b|\btoo\b|\bplus\b|\badditionally\b|\bas well as\b|\balong with\b/i,
      /\?.*\?/,
      /\.\s*\w+\s+\w+\s*\?/
    ];
    
    let hasMultipleIntents = conjunctionPatterns.some(pattern => pattern.test(text));
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 1) hasMultipleIntents = true;
    
    let intents = [];
    if (hasMultipleIntents) {
      intents = text
        .replace(/([.!?])\s+/g, '$1|')
        .replace(/\band\b|\balso\b/gi, '|and')
        .split('|')
        .filter(s => s.trim().length > 0)
        .map(s => s.trim());
    }
    
    return {
      hasMultipleIntents,
      intents: hasMultipleIntents ? intents : [text]
    };
  }
};

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationContext, setConversationContext] = useState([]);
  const [showFeedback, setShowFeedback] = useState(null);
  const [_showCategories, setShowCategories] = useState(false); // Prefixed with underscore to indicate intentionally unused
  const [activeCategory, setActiveCategory] = useState(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const chatBoxRef = useRef(null);
  const [qaPairs, setQaPairs] = useState([]);
  
  const [contextMemory, setContextMemory] = useState({});
  const [_conversationSummary, setConversationSummary] = useState({ // Prefixed with underscore to indicate intentionally unused
    topics: [],
    entities: {}
  });
  
  const [userPersona, setUserPersona] = useState({
    expertise: 'unknown',
    verbosity: 'medium',
    interests: [],
    commonQuestions: {},
    previousTopics: [],
    lastInteraction: null
  });
  const [multiIntentState, setMultiIntentState] = useState({
    hasMultipleIntents: false,
    intents: [],
    currentIntentIndex: 0
  });

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setQaPairs(qaData);
    
    try {
      const savedMemory = localStorage.getItem('chatbotUserMemory');
      if (savedMemory) {
        const parsedMemory = JSON.parse(savedMemory);
        
        if (parsedMemory && parsedMemory.lastInteraction) {
          const daysSinceLastInteraction = 
            (Date.now() - parsedMemory.lastInteraction) / (1000 * 60 * 60 * 24);
          
          if (daysSinceLastInteraction <= 30) {
            setUserPersona(prevState => ({
              ...prevState,
              ...parsedMemory.persona
            }));
            setConversationSummary(parsedMemory.summary || {topics: [], entities: {}});
            setContextMemory(prevState => ({
              ...prevState,
              longTerm: parsedMemory.longTermMemory || {}
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved chat memory:', error);
    }
    
    if (!hasGreeted) {
      setTimeout(() => {
        const isReturningUser = userPersona.lastInteraction !== null;
        
        const welcomeMessage = {
          type: 'assistant',
          content: isReturningUser ?
            `👋 Welcome back! I remember we talked about ${userPersona.previousTopics.slice(0, 2).join(' and ')} before. How can I help with your social media questions today?` :
            "👋 Hi there! I'm your Social Media Assistant. I can help with social media questions, reporting problems, content strategies, and platform-specific issues. What can I help you with today?",
          isWelcome: true
        };
        
        setMessages([welcomeMessage]);
        
        if (isReturningUser && userPersona.interests.length > 0) {
          const interest = userPersona.interests[0];
          setSuggestions([
            `More about ${interest}?`,
            "What can you help me with?",
            "How to grow my followers?"
          ]);
        } else {
          setSuggestions([
            "What can you help me with?",
            "How do I report harassment?",
            "How to grow my followers?"
          ]);
        }
        setHasGreeted(true);
      }, 500);
    }
  }, [hasGreeted, userPersona.lastInteraction, userPersona.previousTopics, userPersona.interests]);

  const handleSimpleMessages = (userInput) => {
    const input = userInput.toLowerCase().trim();
    
    const detectPattern = (patterns, threshold = 0.6) => {
      if (!patterns || !Array.isArray(patterns)) return false;
      const exactMatch = patterns.some(pattern => 
        input === pattern || input.match(new RegExp(`^${pattern}[.!?]*$`, 'i')));
      
      if (exactMatch) return true;
      
      return patterns.some(pattern => {
        if (pattern.length < 5) {
          return input.match(new RegExp(`\\b${pattern}\\b`, 'i'));
        }
        
        if (input.includes(pattern)) return true;
        
        const similarity = nlpUtils.levenshteinSimilarity(input, pattern);
        return similarity >= threshold;
      });
    };
    
    if (detectPattern(messagePatterns.greetings)) {
      const hour = new Date().getHours();
      let timeGreeting = "Hello";
      
      if (hour < 12) timeGreeting = "Good morning";
      else if (hour < 18) timeGreeting = "Good afternoon";
      else timeGreeting = "Good evening";
      
      const greetings = [
        `👋 ${timeGreeting}! How can I help with your social media questions today?`,
        `${timeGreeting}! I'm your social media assistant. What would you like to know?`,
        `Hey there! Ready to answer your social media questions. What's on your mind?`,
        `${timeGreeting}! I'm here to help with all things social media. What do you need?`
      ];
      
      return {
        content: greetings[Math.floor(Math.random() * greetings.length)],
        confidence: 1.0,
        isGreeting: true
      };
    }
    
    if (detectPattern(messagePatterns.farewells)) {
      const farewells = [
        "Goodbye! Feel free to come back if you have more questions about social media!",
        "See you later! I'm here whenever you need social media help.",
        "Take care! Come back anytime for more social media assistance.",
        "Bye for now! Hope I was able to help with your social media questions."
      ];
      
      return {
        content: farewells[Math.floor(Math.random() * farewells.length)],
        confidence: 1.0,
        isFarewell: true
      };
    }
    
    if (detectPattern(messagePatterns.thanks)) {
      const thanks = [
        "You're welcome! Is there anything else about social media you'd like to know?",
        "Happy to help! Any other social media questions I can assist with?",
        "My pleasure! Let me know if you need anything else about social media.",
        "Glad I could help! Feel free to ask more about social media anytime."
      ];
      
      return {
        content: thanks[Math.floor(Math.random() * thanks.length)],
        confidence: 1.0,
        isThanks: true
      };
    }
    
    if (detectPattern(messagePatterns.whatCanIAsk)) {
      return {
        content: "I can help with many social media topics including:\n\n• Reporting problems (harassment, fake accounts, etc.)\n• Privacy & security settings\n• Growth strategies & audience building\n• Content creation tips & trends\n• Platform-specific features\n• Analytics & performance measuring\n• Community management\n• Crisis handling\n• AI & social media integration\n• Social commerce\n\nFeel free to ask about any of these or browse categories!",
        confidence: 1.0,
        isWhatCanIAsk: true
      };
    }
    
    if (detectPattern(messagePatterns.confused)) {
      return {
        content: "I'm sorry if I wasn't clear. Let me help you better - could you tell me specifically what you're looking to learn about social media? Or you can try one of these topics: reporting problems, growing followers, or privacy settings.",
        confidence: 0.9,
        isConfusion: true
      };
    }
    
    if (detectPattern(messagePatterns.positive)) {
      return {
        content: "I'm glad that was helpful! Is there anything else about social media you'd like to know?",
        confidence: 0.9,
        isPositive: true
      };
    }
    
    if (detectPattern(messagePatterns.negative)) {
      return {
        content: "I apologize for not meeting your expectations. Could you help me understand what you're looking for more specifically? I know about reporting issues, account security, content strategies, and platform features.",
        confidence: 0.9,
        isNegative: true
      };
    }
    
    return null;
  };

  const findBestMatch = (userInput) => {
    if (!userInput || qaPairs.length === 0) return null;
    
    const simpleResponse = handleSimpleMessages(userInput);
    if (simpleResponse) return simpleResponse;
    
    const input = userInput.trim().toLowerCase();
    const results = [];
    
    const userTokens = nlpUtils.tokenize(input);
    const userKeywords = nlpUtils.extractKeywords(input);
    const expandedKeywords = nlpUtils.expandWithSynonyms(userKeywords);
    
    const exactMatch = qaPairs.find(q => q.question.trim().toLowerCase() === input);
    if (exactMatch) return { 
      answer: exactMatch.answer, 
      confidence: 1.0, 
      source: exactMatch.question,
      matched: 'exact' 
    };
    
    const trackEntities = (text) => {
      const entities = {
        platforms: ['facebook', 'instagram', 'twitter', 'x', 'tiktok', 'linkedin', 'youtube', 'pinterest', 'snapchat', 'threads', 'reddit', 'bereal'],
        features: ['stories', 'reels', 'tweet', 'post', 'profile', 'live', 'message', 'dm', 'comment', 'algorithm', 'feed'],
        actions: ['report', 'block', 'mute', 'like', 'share', 'follow', 'unfollow', 'delete', 'edit', 'tag', 'mention'],
        concerns: ['privacy', 'security', 'harassment', 'bullying', 'hacked', 'scam', 'fake', 'impersonation', 'copyright', 'ban']
      };
      
      const found = {};
      Object.entries(entities).forEach(([category, terms]) => {
        const matches = terms.filter(term => text.includes(term));
        if (matches.length > 0) {
          found[category] = matches;
        }
      });
      
      return found;
    };
    
    const userEntities = trackEntities(input);
    
    if (Object.keys(userEntities).length > 0) {
      setContextMemory(prev => ({
        ...prev,
        recentEntities: userEntities,
        lastUpdated: new Date().getTime()
      }));
    }
    
    const phraseMatches = qaPairs.filter(qa => {
      const question = qa.question.trim().toLowerCase();
      
      if (input.includes(question) || question.includes(input)) {
        const coverage = Math.min(input.length, question.length) / Math.max(input.length, question.length);
        return coverage > 0.6;
      }
      return false;
    });
    
    if (phraseMatches.length > 0) {
      const bestMatch = phraseMatches.sort((a, b) => {
        const aLen = a.question.trim().toLowerCase().length;
        const bLen = b.question.trim().toLowerCase().length;
        const targetLen = input.length;
        return Math.abs(aLen - targetLen) - Math.abs(bLen - targetLen);
      })[0];
      
      return {
        answer: bestMatch.answer,
        confidence: 0.92,
        source: bestMatch.question,
        matched: 'phrase'
      };
    }
    
    for (const qa of qaPairs) {
      const question = qa.question.trim().toLowerCase();
      const qaTokens = nlpUtils.tokenize(question);
      
      const hasKeywordOverlap = expandedKeywords.some(k => question.includes(k)) || 
                              (qa.keywords && qa.keywords.some(k => input.includes(k.toLowerCase())));
      
      if (!hasKeywordOverlap && expandedKeywords.length > 0) {
        continue;
      }
      
      const qaExpandedTokens = qa.keywords ? 
        [...nlpUtils.tokenize(question), ...qa.keywords.map(k => k.toLowerCase())] : 
        nlpUtils.tokenize(question);
      
      const tokenSimilarity = nlpUtils.jaccardSimilarity(
        [...userTokens, ...expandedKeywords],
        qaExpandedTokens
      );
      
      let keywordMatchScore = 0;
      if (qa.keywords && qa.keywords.length > 0) {
        let matches = 0;
        let totalImportance = qa.keywords.length;
        
        expandedKeywords.forEach(keyword => {
          qa.keywords.forEach((qaKeyword, idx) => {
            const importance = Math.pow(0.9, idx);
            
            if (qaKeyword.toLowerCase().includes(keyword) || 
                keyword.includes(qaKeyword.toLowerCase())) {
              matches += importance;
            }
          });
        });
        
        keywordMatchScore = matches / totalImportance;
      }
      
      let entityMatchBoost = 0;
      if (Object.keys(userEntities).length > 0) {
        const qaEntities = trackEntities(question + ' ' + qa.answer);
        
        let matchingEntities = 0;
        let totalUserEntities = 0;
        
        Object.entries(userEntities).forEach(([category, entities]) => {
          entities.forEach(entity => {
            totalUserEntities++;
            if (qaEntities[category]?.includes(entity)) {
              matchingEntities++;
            }
          });
        });
        
        entityMatchBoost = totalUserEntities > 0 ? 
          (matchingEntities / totalUserEntities) * 0.3 : 0;
      }
      
      let contextBoost = 0;
      if (conversationContext.length > 0) {
        const recentMessages = conversationContext.slice(-3).join(' ').toLowerCase();
        const recentTokens = nlpUtils.tokenize(recentMessages);
        
        const contextSimilarity = nlpUtils.overlapSimilarity(recentTokens, qaTokens);
        contextBoost = contextSimilarity * 0.15;
        
        if (contextMemory.recentEntities) {
          const qaEntities = trackEntities(question + ' ' + qa.answer);
          
          Object.entries(contextMemory.recentEntities).forEach(([category, entities]) => {
            if (qaEntities[category]) {
              const matchingEntities = entities.filter(e => qaEntities[category].includes(e));
              if (matchingEntities.length > 0) {
                contextBoost += 0.05;
              }
            }
          });
        }
      }
      
      let levenshteinScore = 0;
      if (question.length < 60 && input.length < 60) {
        levenshteinScore = nlpUtils.levenshteinSimilarity(input, question) * 0.4;
      }
      
      const combinedScore = 
        (tokenSimilarity * 0.35) +
        (keywordMatchScore * 0.25) +
        entityMatchBoost +
        contextBoost +
        levenshteinScore;
      
      const normalizedScore = Math.min(0.95, Math.max(0.1, combinedScore));
      
      results.push({
        answer: qa.answer,
        confidence: normalizedScore,
        source: qa.question,
        matched: 'semantic',
        metrics: {
          tokenSimilarity,
          keywordMatchScore,
          entityMatchBoost,
          contextBoost,
          levenshteinScore
        }
      });
    }
    
    results.sort((a, b) => b.confidence - a.confidence);
    
    if (results.length > 0 && results[0].confidence > 0.4) {
      if (results[0].confidence > 0.7) {
        return results[0];
      }
      
      if (results.length >= 2 && 
          results[0].confidence > 0.5 &&
          results[0].confidence - results[1].confidence < 0.1) {
        
        setContextMemory(prev => ({
          ...prev,
          alternativeMatches: results.slice(0, 3).map(r => r.source)
        }));
      }
      
      return results[0];
    }
    
    if (conversationContext.length > 0) {
      const lastContext = conversationContext[conversationContext.length - 1];
      if (input.includes('what about') || input.startsWith('how about') || 
          input.startsWith('and') || input.startsWith('what if') || 
          input.length < 15) {
        
        const relatedQuestions = qaPairs.filter(qa => 
          nlpUtils.jaccardSimilarity(nlpUtils.tokenize(qa.question), nlpUtils.tokenize(lastContext)) > 0.3 &&
          nlpUtils.jaccardSimilarity(nlpUtils.tokenize(qa.question), nlpUtils.tokenize(input)) > 0.2
        );
        
        if (relatedQuestions.length > 0) {
          return {
            answer: relatedQuestions[0].answer,
            confidence: 0.7,
            source: relatedQuestions[0].question,
            isContextual: true
          };
        }
      }
    }
    
    return null;
  };

  const generateSmartResponse = (userInput, match) => {
    if (!match) {
      return generateSmartFallback(userInput);
    }
    
    // Handle simple message responses (greetings, thanks, etc.)
    if (match.content) {
      return match.content;
    }
    
    const { answer, confidence, source, matched, isContextBased } = match;
    
    if (matched === 'exact' || confidence > 0.95) {
      return answer;
    }
    
    // Using the detected entities in a different way to avoid the unused variable warning
    const userEntities = detectEntities(userInput);
    
    if (isContextBased) {
      const contextPrefixes = [
        `Based on our conversation about ${source}, I think this might help:\n\n`,
        `Following up on your question, here's some relevant information:\n\n`,
        `Continuing from our discussion, I can tell you that:\n\n`
      ];
      return contextPrefixes[Math.floor(Math.random() * contextPrefixes.length)] + answer;
    }
    
    if (matched === 'phrase' || confidence > 0.8) {
      return answer;
    }
    
    if (confidence > 0.6) {
      const mediumConfidencePrefixes = [
        `Here's what I know about that:\n\n`,
        `This information should help:\n\n`,
        `I think this addresses your question:\n\n`
      ];
      return mediumConfidencePrefixes[Math.floor(Math.random() * mediumConfidencePrefixes.length)] + answer;
    }
    
    const uncertainPrefixes = [
      `I'm not entirely sure if this is what you're asking, but here's some information that might help:\n\n`,
      `This might be related to what you're looking for:\n\n`,
      `While I'm not certain this fully answers your question, this information may be useful:\n\n`
    ];
    
    return uncertainPrefixes[Math.floor(Math.random() * uncertainPrefixes.length)] + answer;
  };
  
  const generateSmartFallback = (userInput) => {
    const input = userInput.toLowerCase();
    
    const platforms = {
      instagram: ['instagram', 'ig', 'insta', 'gram'],
      facebook: ['facebook', 'fb', 'meta'],
      twitter: ['twitter', 'tweet', 'x'],
      tiktok: ['tiktok', 'tok', 'tt'],
      youtube: ['youtube', 'yt', 'video', 'channel'],
      linkedin: ['linkedin', 'li', 'professional']
    };
    
    let detectedPlatform = null;
    Object.entries(platforms).forEach(([platform, keywords]) => {
      if (keywords.some(k => input.includes(k))) {
        detectedPlatform = platform;
      }
    });
    
    const topics = {
      growth: ['growth', 'increase', 'grow', 'more', 'followers', 'audience'],
      engagement: ['engagement', 'likes', 'comments', 'shares', 'interact'],
      reporting: ['report', 'analytics', 'metrics', 'stats', 'measure', 'track'],
      privacy: ['privacy', 'security', 'protect', 'private', 'secure'],
      content: ['content', 'post', 'create', 'publish', 'video', 'photo']
    };
    
    const detectedTopics = [];
    Object.entries(topics).forEach(([topic, keywords]) => {
      if (keywords.some(k => input.includes(k))) {
        detectedTopics.push(topic);
      }
    });
    
    if (detectedPlatform && detectedTopics.length > 0) {
      const topic = detectedTopics[0];
      return `I don't have a specific answer about ${topic} on ${detectedPlatform}, but I can help with ${topic} strategies. Would you like general information about ${topic} on ${detectedPlatform}?`;
    } 
    else if (detectedPlatform) {
      return `I don't have a specific answer about ${detectedPlatform}, but I can help with growing followers, content creation, or analytics for ${detectedPlatform}. Which aspect are you interested in?`;
    } 
    else if (detectedTopics.length > 0) {
      const topicsList = detectedTopics.slice(0, 2).join(" and ");
      return `I don't have a specific answer about ${topicsList}, but I'd be happy to help if you could specify which platform you're asking about or provide more details.`;
    }
    
    const fallbacks = [
      "I don't have a specific answer for that question. Could you rephrase or try one of the suggested topics below?",
      "I need a bit more context to help you effectively. Are you asking about a specific social media platform or feature?",
      "I'm not sure I fully understand your question. Would you like to know about content strategy, analytics, or growing your audience?",
      "To help you better, could you specify which social platform you're asking about or what specific problem you're trying to solve?"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };
  
  const detectEntities = (text) => {
    // Check if text is defined before using toLowerCase
    if (!text) return { platforms: [], features: [], metrics: [], actions: [] };
    
    const input = text.toLowerCase();
    const entities = {
      platforms: [],
      features: [],
      metrics: [],
      actions: []
    };
    
    const platformKeywords = {
      instagram: ['instagram', 'ig', 'insta'],
      facebook: ['facebook', 'fb', 'meta'],
      twitter: ['twitter', 'tweet', 'x'],
      tiktok: ['tiktok', 'tok'],
      youtube: ['youtube', 'yt'],
      linkedin: ['linkedin', 'li'],
      pinterest: ['pinterest', 'pin'],
      snapchat: ['snapchat', 'snap']
    };
    
    const featureKeywords = {
      stories: ['story', 'stories'],
      posts: ['post', 'posts', 'content'],
      reels: ['reel', 'reels', 'short video'],
      profile: ['profile', 'bio', 'about'],
      messages: ['message', 'dm', 'direct', 'chat'],
      comments: ['comment', 'reply', 'respond']
    };
    
    const metricKeywords = {
      engagement: ['engagement', 'interact', 'interaction'],
      followers: ['follower', 'following', 'audience'],
      reach: ['reach', 'impressions', 'views'],
      clicks: ['click', 'tap', 'ctr'],
      conversion: ['conversion', 'convert', 'sale']
    };
    
    const actionKeywords = {
      report: ['report', 'flag', 'alert'],
      block: ['block', 'ban', 'restrict'],
      grow: ['grow', 'increase', 'boost', 'improve'],
      analyze: ['analyze', 'measure', 'track', 'monitor']
    };
    
    Object.entries(platformKeywords).forEach(([platform, keywords]) => {
      if (keywords.some(k => input.includes(k))) {
        entities.platforms.push(platform);
      }
    });
    
    Object.entries(featureKeywords).forEach(([feature, keywords]) => {
      if (keywords.some(k => input.includes(k))) {
        entities.features.push(feature);
      }
    });
    
    Object.entries(metricKeywords).forEach(([metric, keywords]) => {
      if (keywords.some(k => input.includes(k))) {
        entities.metrics.push(metric);
      }
    });
    
    Object.entries(actionKeywords).forEach(([action, keywords]) => {
      if (keywords.some(k => input.includes(k))) {
        entities.actions.push(action);
      }
    });
    
    return entities;
  };
  
  const processUserMessage = (message) => {
    const match = findBestMatch(message);
    
    // Handle simple message responses (greetings, thanks, etc.)
    if (match && match.content) {
      const assistantMessage = {
        type: 'assistant',
        content: match.content,
        confidence: match.confidence || 1.0,
        source: match.source || null,
        isSimpleResponse: true
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      setIsTyping(false);
      
      // Set appropriate suggestions based on the response type
      if (match.isWhatCanIAsk) {
        setSuggestions([
          "How do I report harassment?",
          "How to grow my followers?",
          "Privacy settings guide"
        ]);
      } else if (match.isGreeting) {
        setSuggestions([
          "What can you help me with?",
          "How do I report harassment?",
          "How to grow my followers?"
        ]);
      } else {
        setSuggestions([
          "What can you help me with?",
          "How to improve engagement?",
          "Creating social media reports"
        ]);
      }
      
      return;
    }
    
    // Handle Q&A responses
    const responseContent = generateSmartResponse(message, match);
    const confidence = match ? match.confidence : 0.3;
    
    const assistantMessage = {
      type: 'assistant',
      content: responseContent,
      confidence,
      source: match?.source || null
    };
    
    setMessages(prevMessages => [...prevMessages, assistantMessage]);
    setIsTyping(false);
    
    if (match) {
      generateSuggestions(match.source);
    } else {
      const entities = detectEntities(message);
      const newSuggestions = [];
      
      if (entities.platforms.length > 0) {
        const platform = entities.platforms[0];
        newSuggestions.push(
          `How to grow followers on ${platform}?`,
          `Best practices for ${platform} content`,
          `${platform} analytics explained`
        );
      } else if (entities.features.length > 0) {
        const feature = entities.features[0];
        newSuggestions.push(
          `How to use ${feature} effectively`,
          `${feature} best practices`,
          `Measuring ${feature} performance`
        );
      }
      
      if (newSuggestions.length > 0) {
        setSuggestions(newSuggestions);
      } else {
        if (userPersona.interests.length > 0) {
          const interest = userPersona.interests[0];
          setSuggestions([
            `Tips for ${interest}`,
            "How to improve engagement?",
            "Creating social media reports"
          ]);
        } else {
          setSuggestions([
            "How to improve engagement?",
            "Creating social media reports",
            "Best time to post on social media"
          ]);
        }
      }
    }
    
    if (!match?.isFeedback && !match?.content && message.split(' ').length > 3) {
      setShowFeedback(messages.length + 1);
    }
  };

  const generateSuggestions = (source) => {
    // Add safety check
    if (!source) return ["How to improve engagement?", "Creating social media reports", "Best time to post on social media"];
    
    const entities = detectEntities(source);
    const suggestions = [];
    
    if (entities.platforms.length > 0) {
      const platform = entities.platforms[0];
      suggestions.push(
        `How to grow followers on ${platform}?`,
        `Best practices for ${platform} content`,
        `How to analyze ${platform} performance?`
      );
    } else if (entities.features.length > 0) {
      const feature = entities.features[0];
      suggestions.push(
        `How to optimize ${feature}?`,
        `Best practices for ${feature}`,
        `How to measure ${feature} success?`
      );
    } else if (entities.actions.length > 0) {
      const action = entities.actions[0];
      suggestions.push(
        `How to ${action} effectively?`,
        `Best tools for ${action}`,
        `Common issues with ${action}`
      );
    } else {
      suggestions.push(
        "How to improve engagement?",
        "Creating social media reports",
        "Best time to post on social media"
      );
    }
    
    return suggestions;
  };

  const handleFeedback = (index, isHelpful) => {
    const feedbackMessage = {
      type: 'assistant',
      content: isHelpful 
        ? "Thanks for your feedback! I'm glad I could help. Anything else I can assist with?"
        : "Sorry to hear that wasn't helpful. Could you provide more details or rephrase your question?",
      isFeedback: true
    };
    
    setMessages(prevMessages => [...prevMessages, feedbackMessage]);
    setShowFeedback(null);
  };

  const sendMessage = async (message = inputMessage, isClickedSuggestion = false) => {
    const messageToSend = isClickedSuggestion ? message : inputMessage;
    if (messageToSend.trim() === '') return;

    if (multiIntentState.hasMultipleIntents && 
        multiIntentState.currentIntentIndex < multiIntentState.intents.length - 1) {
      
      setMultiIntentState(prev => ({
        ...prev,
        currentIntentIndex: prev.currentIntentIndex + 1
      }));
      
      const nextIntent = multiIntentState.intents[multiIntentState.currentIntentIndex + 1];
      
      setTimeout(() => {
        const followupMessage = {
          type: 'assistant',
          content: "I'll now address your other question.",
          isMultiIntent: true
        };
        
        setMessages(prevMessages => [...prevMessages, followupMessage]);
        
        processUserMessage(nextIntent);
      }, 1500);
      
      return;
    }

    const userMessage = { type: 'user', content: messageToSend };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    const thinkingTime = Math.max(600, Math.min(1500, messageToSend.length * 20));
    
    setTimeout(() => {
      const multiIntentAnalysis = nlpUtils.detectMultiIntent(messageToSend);
    
      if (multiIntentAnalysis.hasMultipleIntents && multiIntentAnalysis.intents.length > 1) {
        setMultiIntentState({
          hasMultipleIntents: true,
          intents: multiIntentAnalysis.intents,
          currentIntentIndex: 0
        });
        
        processUserMessage(multiIntentAnalysis.intents[0]);
        
        if (multiIntentAnalysis.intents.length > 1) {
          setTimeout(() => {
            const multiMessage = {
              type: 'assistant', 
              content: "I notice you have multiple questions. I'll answer them one by one.",
              isMultiIntent: true
            };
            setMessages(prevMessages => [...prevMessages, multiMessage]);
          }, 800);
        }
      } else {
        processUserMessage(messageToSend);
      }
    }, thinkingTime);
    
    setConversationContext(prev => {
      const updatedContext = [...prev, messageToSend];
      return updatedContext.slice(-8);
    });
    
    const entities = detectEntities(messageToSend);
    
    if (Object.values(entities).some(arr => arr.length > 0)) {
      setContextMemory(prev => ({
        ...prev,
        recentEntities: entities,
        lastMessage: messageToSend,
        timestamp: new Date().getTime()
      }));
    }
  };

  const activateHelpMode = () => {
    setIsTyping(true);
    setTimeout(() => {
      const helpMessage = {
        type: 'assistant',
        content: "I can help you with these topics:\n\n• Social Media Analytics & Metrics\n• Content Strategy & Creation\n• Audience Growth & Engagement\n• Reporting & Performance Tracking\n• Platform-specific Features\n\nWhat would you like to learn about?",
        isHelp: true
      };
      setMessages(prevMessages => [...prevMessages, helpMessage]);
      setIsTyping(false);
      
      setSuggestions([
        "How to read analytics?", 
        "Creating effective reports", 
        "Measuring campaign success"
      ]);
    }, 800);
  };

  const browseCategories = () => {
    setShowCategories(true);
    setIsTyping(true);
    
    setTimeout(() => {
      const categoryMessage = {
        type: 'assistant',
        content: "Here are the main social media topics I can help with. What would you like to learn about?",
        isCategories: true
      };
      setMessages(prevMessages => [...prevMessages, categoryMessage]);
      setIsTyping(false);
      
      setSuggestions(Object.keys(socialMediaCategories));
    }, 500);
  };
  
  const handleCategorySelect = (category) => {
    setActiveCategory(category);
    
    if (socialMediaCategories[category]) {
      const subcategories = Object.keys(socialMediaCategories[category]);
      
      const categoryMessage = {
        type: 'assistant',
        content: `Here are topics related to ${category}:`,
        isSubcategory: true
      };
      setMessages(prevMessages => [...prevMessages, categoryMessage]);
      
      setSuggestions(subcategories);
    }
  };
  
  const handleSubcategorySelect = (subcategory) => {
    if (activeCategory && socialMediaCategories[activeCategory][subcategory]) {
      const questions = socialMediaCategories[activeCategory][subcategory].slice(0, 3);
      
      const subcategoryMessage = {
        type: 'assistant',
        content: `Here are some questions about ${subcategory}:`,
        isQuestionList: true
      };
      setMessages(prevMessages => [...prevMessages, subcategoryMessage]);
      
      setSuggestions(questions);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden transform transition-all duration-300 ease-in-out hover:shadow-2xl">
      <div className="p-4 md:p-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg">
        <h2 className="text-2xl md:text-3xl font-semibold flex items-center">
          <FaRobot className="mr-3 text-blue-200" /> Social Media Assistant
        </h2>
        <p className="text-blue-100 text-sm md:text-base mt-1 ml-1">Ask about reporting problems, privacy, content strategies & more</p>
      </div>
      
      <div ref={chatBoxRef} className="h-80 md:h-96 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50 rounded-lg shadow-inner">
        {messages.map((message, index) => (
          <div key={index} className={`space-y-2 animate-fadeIn ${message.temporary ? 'opacity-70' : 'opacity-100'}`}>
            <div
              className={`flex items-center space-x-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300 ease-in-out`}
            >
              {message.type === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center shadow-sm">
                  <FaRobot className="text-white text-sm" />
                </div>
              )}
              <div 
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white transform transition-all duration-300' 
                    : message.isFeedback 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : message.isThinking
                        ? 'bg-gray-100 text-gray-600 border border-gray-200'
                        : 'bg-white text-gray-800 border border-gray-100'
                }`}
              >
                {message.content && message.content.split('\n').map((line, i) => (
                  <p key={i} className="my-1">
                    {line}
                  </p>
                ))}
                
                {message.type === 'assistant' && message.confidence > 0 && !message.isFeedback && !message.isSimpleResponse && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-1 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${
                          message.confidence > 0.7 ? 'bg-green-500' : 
                          message.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                        } transition-all duration-500 ease-out`} 
                        style={{width: `${message.confidence * 100}%`}}
                      ></div>
                    </div>
                    <span>{Math.round(message.confidence * 100)}% confidence</span>
                  </div>
                )}
              </div>
              
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shadow-sm">
                  <FaUser className="text-blue-500 text-sm" />
                </div>
              )}
            </div>
            
            {showFeedback === index && message.type === 'assistant' && !message.isFeedback && !message.isSimpleResponse && (
              <div className="flex justify-center space-x-4 mt-1 animate-fadeIn">
                <button 
                  onClick={() => handleFeedback(index, true)}
                  className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded-full transition-all duration-200 hover:bg-green-100"
                >
                  <FaThumbsUp /> <span>Helpful</span>
                </button>
                <button 
                  onClick={() => handleFeedback(index, false)}
                  className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded-full transition-all duration-200 hover:bg-red-100"
                >
                  <FaThumbsDown /> <span>Not helpful</span>
                </button>
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start items-center space-x-2 animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center shadow-sm">
              <FaRobot className="text-white text-sm" />
            </div>
            <div className="bg-white text-gray-800 px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {suggestions.length > 0 && (
        <div className="px-3 md:px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 overflow-x-auto">
          <p className="text-xs md:text-sm text-blue-800 mb-2 font-medium">{activeCategory ? `Topics about ${activeCategory}:` : 'Suggested questions:'}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  if (Object.keys(socialMediaCategories).includes(suggestion)) {
                    handleCategorySelect(suggestion);
                  } else if (activeCategory && Object.keys(socialMediaCategories[activeCategory]).includes(suggestion)) {
                    handleSubcategorySelect(suggestion);
                  } else {
                    sendMessage(suggestion, true);
                    setSuggestions([]);
                    setActiveCategory(null);
                  }
                }}
                className="text-xs md:text-sm whitespace-nowrap px-3 md:px-4 py-1.5 bg-white hover:bg-blue-100 text-blue-700 rounded-full transition-all duration-200 border border-blue-100 shadow-sm hover:shadow hover:scale-105"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-3 md:p-4 border-t bg-white rounded-b-lg">
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <div className="relative flex-grow">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about social media..."
              className="w-full md:flex-grow pl-4 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm md:text-base shadow-sm"
            />
            {inputMessage && (
              <button
                onClick={() => setInputMessage('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear input"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={browseCategories}
              className="p-3 md:p-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm hover:shadow"
              aria-label="Browse topics"
            >
              <FaListUl />
            </button>
            <button
              onClick={() => activateHelpMode()}
              className="p-3 md:p-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm hover:shadow"
              aria-label="Help"
            >
              <FaQuestion />
            </button>
            <button
              onClick={() => sendMessage()}
              className="px-5 md:px-8 py-3 md:py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm hover:shadow flex items-center space-x-2"
              disabled={inputMessage.trim() === ''}
            >
              <span>Send</span>
              <FaAngleRight className={`transform ${inputMessage.trim() !== '' ? 'translate-x-1' : ''} transition-transform duration-200`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;