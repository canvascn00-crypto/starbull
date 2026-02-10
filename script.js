// ===== 全局配置 =====
const CONFIG = {
    // 预售合约地址（请替换为您的实际地址）
    PRESALE_CONTRACT: '0xA616911194eca5aD6E858a2aCFAC2cDaDC8f04B1',
    
    // 代币地址（请替换为您的实际地址）
    TOKEN_CONTRACT: '0x36e18dCf2364F25701661C623945e99c6E39E61B',
    
    // 价格配置（每BNB的代币数量）
    TOKENS_PER_BNB: 617284,
    
    // 预售阶段配置
    TOTAL_STAGES: 23,
    CURRENT_STAGE: 11,
    STAGE_TARGET: 650, // 总目标BNB
    RAISED_AMOUNT: 422.5, // 已筹集BNB
    
    // 网络配置
    BSC_MAINNET: {
        chainId: '0x38', // 56
        chainName: 'Binance Smart Chain',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/']
    },
    
    BSC_TESTNET: {
        chainId: '0x61', // 97
        chainName: 'BSC Testnet',
        nativeCurrency: {
            name: 'tBNB',
            symbol: 'tBNB',
            decimals: 18
        },
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        blockExplorerUrls: ['https://testnet.bscscan.com/']
    }
};

// ===== 全局变量 =====
let onboard = null;
let wallet = null;
let provider = null;
let ethersProvider = null;
let signer = null;
let userAddress = null;
let networkId = null;

// 倒计时目标时间
let countdownTarget = null;

// ===== 页面初始化 =====
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1. 初始化钱包连接
        await initWallet();
        
        // 2. 初始化UI组件
        initNavigation();
        initPurchase();
        initCountdown();
        initAnimations();
        
        // 3. 检查现有连接
        await checkExistingConnection();
        
        // 4. 初始化交易历史
        initTransactionHistory();
        
        console.log('StarBull Presale initialized successfully!');
        
    } catch (error) {
        console.error('Initialization failed:', error);
        showStatus('Failed to initialize application', 'error');
    }
});

// ===== 钱包连接功能 =====
async function initWallet() {
    try {
        // 1. 配置钱包模块
        const injected = window.OnboardInjectedModules.injectedModule();
        const walletConnect = window.OnboardInjectedModules.walletConnectModule({
            // 使用公共测试ID - 不需要注册
            projectId: 'f6a4c5d5e0b2c3d4e5f6a7b8c9d0e1f2',
            requiredChains: [56, 97]
        });
        
        // 2. 初始化Onboard
        onboard = window.Onboard({
            wallets: [injected, walletConnect],
            chains: [
                {
                    id: 56,
                    token: 'BNB',
                    label: 'Binance Smart Chain',
                    rpcUrl: CONFIG.BSC_MAINNET.rpcUrls[0]
                },
                {
                    id: 97,
                    token: 'tBNB',
                    label: 'BSC Testnet',
                    rpcUrl: CONFIG.BSC_TESTNET.rpcUrls[0]
                }
            ],
            appMetadata: {
                name: 'StarBull Presale',
                icon: 'https://starbull.finance/logo.png',
                description: 'StarBull Meme Token Presale',
                gettingStartedGuide: 'https://docs.starbull.finance',
                explore: 'https://starbull.finance'
            },
            accountCenter: {
                desktop: {
                    enabled: false // 禁用内置账户中心，使用自定义UI
                },
                mobile: {
                    enabled: false
                }
            },
            connect: {
                autoConnectLastWallet: true
            }
        });
        
        console.log('Wallet initialization complete');
        
    } catch (error) {
        console.error('Wallet initialization failed:', error);
        throw error;
    }
}

// 连接钱包
async function connectWallet() {
    try {
        // 显示连接状态
        const connectBtn = document.getElementById('connectBtn');
        const originalHTML = connectBtn.innerHTML;
        connectBtn.innerHTML = '<div class="loading"></div> Connecting...';
        connectBtn.disabled = true;
        
        // 打开钱包选择界面
        const wallets = await onboard.connectWallet();
        
        if (wallets.length === 0) {
            throw new Error('No wallet selected');
        }
        
        // 获取钱包信息
        wallet = wallets[0];
        provider = wallet.provider;
        
        // 设置Ethers.js provider
        ethersProvider = new ethers.providers.Web3Provider(provider);
        signer = ethersProvider.getSigner();
        
        // 获取账户和网络信息
        const accounts = await wallet.accounts;
        const chains = await wallet.chains;
        
        if (accounts.length === 0 || chains.length === 0) {
            throw new Error('Failed to get account or network info');
        }
        
        userAddress = accounts[0].address;
        networkId = parseInt(chains[0].id, 10);
        
        // 更新UI
        updateWalletUI();
        
        // 设置事件监听
        setupWalletListeners();
        
        // 获取余额
        await updateBalances();
        
        showStatus('Wallet connected successfully!', 'success');
        
        return true;
        
    } catch (error) {
        console.error('Wallet connection failed:', error);
        showStatus(`Connection failed: ${error.message}`, 'error');
        
        // 重置按钮状态
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i><span>Connect Wallet to Purchase</span>';
        connectBtn.disabled = false;
        
        return false;
    }
}

// 断开钱包连接
async function disconnectWallet() {
    try {
        if (wallet) {
            await onboard.disconnectWallet({ label: wallet.label });
        }
        
        // 重置状态
        wallet = null;
        provider = null;
        ethersProvider = null;
        signer = null;
        userAddress = null;
        networkId = null;
        
        // 更新UI
        updateWalletUI();
        
        // 清除余额显示
        document.getElementById('bnbBalance').textContent = 'Balance: -- BNB';
        document.getElementById('tokenBalance').textContent = 'Tokens: -- STARBULL';
        
        showStatus('Wallet disconnected', 'info');
        
    } catch (error) {
        console.error('Disconnect failed:', error);
        showStatus('Disconnect failed', 'error');
    }
}

// 更新钱包UI状态
function updateWalletUI() {
    const connectBtn = document.getElementById('connectBtn');
    const walletBtn = document.getElementById('connectWalletBtn');
    const walletStatus = document.getElementById('walletStatus');
    const walletAddress = document.getElementById('walletAddress');
    const networkStatus = document.getElementById('networkStatus');
    const networkBtn = document.getElementById('networkBtn');
    const networkText = document.getElementById('networkText');
    const buyBtn = document.getElementById('buyBtn');
    
    if (userAddress) {
        // 已连接状态
        const shortAddress = `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
        
        // 更新连接按钮
        connectBtn.innerHTML = '<i class="fas fa-check-circle"></i><span>Wallet Connected</span>';
        connectBtn.classList.remove('btn-primary');
        connectBtn.classList.add('btn-success');
        
        // 更新顶部钱包按钮
        walletBtn.innerHTML = `<i class="fas fa-wallet"></i><span>${shortAddress}</span>`;
        walletBtn.classList.add('connected');
        
        // 显示钱包地址
        walletAddress.textContent = shortAddress;
        walletStatus.classList.remove('d-none');
        
        // 更新网络状态
        updateNetworkUI();
        
        // 启用购买按钮
        buyBtn.disabled = false;
        
    } else {
        // 未连接状态
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i><span>Connect Wallet to Purchase</span>';
        connectBtn.classList.remove('btn-success');
        connectBtn.classList.add('btn-primary');
        connectBtn.disabled = false;
        
        walletBtn.innerHTML = '<i class="fas fa-wallet"></i><span>Connect Wallet</span>';
        walletBtn.classList.remove('connected');
        
        walletStatus.classList.add('d-none');
        networkStatus.classList.add('d-none');
        
        networkBtn.innerHTML = '<i class="fas fa-network-wired"></i><span>Network</span>';
        networkBtn.classList.remove('correct', 'wrong');
        networkText.textContent = 'Network';
        
        buyBtn.disabled = true;
    }
}

// 更新网络UI
function updateNetworkUI() {
    const networkStatus = document.getElementById('networkStatus');
    const networkBtn = document.getElementById('networkBtn');
    const networkText = document.getElementById('networkText');
    
    if (!networkId) {
        networkStatus.innerHTML = '<i class="fas fa-question-circle"></i><span>Unknown Network</span>';
        networkStatus.className = 'network-status';
        networkStatus.classList.remove('d-none');
        
        networkBtn.classList.remove('correct', 'wrong');
        networkText.textContent = 'Network';
        return;
    }
    
    // 检查是否为支持的BSC网络
    const isBSC = networkId === 56 || networkId === 97;
    const isCorrectNetwork = networkId === 56; // BSC主网
    
    if (isBSC) {
        const networkName = networkId === 56 ? 'BSC Mainnet' : 'BSC Testnet';
        
        networkStatus.innerHTML = `<i class="fas fa-${isCorrectNetwork ? 'check-circle' : 'exclamation-triangle'}"></i><span>Connected to ${networkName}</span>`;
        networkStatus.className = `network-status ${isCorrectNetwork ? 'correct' : 'wrong'}`;
        
        networkBtn.innerHTML = `<i class="fas fa-network-wired"></i><span>${networkName}</span>`;
        networkBtn.className = `network-btn ${isCorrectNetwork ? 'correct' : 'wrong'}`;
        networkText.textContent = networkName;
        
    } else {
        networkStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Wrong Network (ID: ${networkId})</span>`;
        networkStatus.className = 'network-status wrong';
        
        networkBtn.innerHTML = '<i class="fas fa-network-wired"></i><span>Wrong Network</span>';
        networkBtn.className = 'network-btn wrong';
        networkText.textContent = 'Wrong Network';
    }
    
    networkStatus.classList.remove('d-none');
}

// 切换网络到BSC
async function switchToBSC() {
    try {
        if (!provider || !wallet) {
            showStatus('Please connect wallet first', 'error');
            return false;
        }
        
        showStatus('Switching to BSC Mainnet...', 'pending');
        
        // 尝试切换到BSC主网
        const params = CONFIG.BSC_MAINNET;
        
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: params.chainId }]
            });
            
            showStatus('Network switched to BSC Mainnet', 'success');
            return true;
            
        } catch (switchError) {
            // 如果链未添加，尝试添加它
            if (switchError.code === 4902) {
                try {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [params]
                    });
                    
                    showStatus('BSC Mainnet added successfully', 'success');
                    return true;
                    
                } catch (addError) {
                    console.error('Failed to add network:', addError);
                    showStatus(`Failed to add network: ${addError.message}`, 'error');
                    return false;
                }
            }
            
            console.error('Failed to switch network:', switchError);
            showStatus(`Failed to switch network: ${switchError.message}`, 'error');
            return false;
        }
        
    } catch (error) {
        console.error('Network switch error:', error);
        showStatus(`Network switch failed: ${error.message}`, 'error');
        return false;
    }
}

// 设置钱包事件监听
function setupWalletListeners() {
    if (!wallet) return;
    
    // 监听账户变化
    wallet.accounts.subscribe(async (accounts) => {
        if (accounts.length === 0) {
            // 用户断开连接
            await disconnectWallet();
        } else if (accounts[0].address !== userAddress) {
            // 账户切换
            userAddress = accounts[0].address;
            updateWalletUI();
            await updateBalances();
            showStatus('Account changed', 'info');
        }
    });
    
    // 监听网络变化
    wallet.chains.subscribe(async (chains) => {
        if (chains.length === 0) return;
        
        const newNetworkId = parseInt(chains[0].id, 10);
        if (newNetworkId !== networkId) {
            networkId = newNetworkId;
            updateNetworkUI();
            await updateBalances();
            
            if (networkId !== 56) {
                showStatus(`Please switch to BSC Mainnet (Chain ID: 56)`, 'error');
            }
        }
    });
}

// 检查现有连接
async function checkExistingConnection() {
    try {
        // 获取之前连接的钱包
        const previouslyConnectedWallets = JSON.parse(
            window.localStorage.getItem('connectedWallets') || '[]'
        );
        
        if (previouslyConnectedWallets.length > 0) {
            // 自动重新连接
            const wallets = await onboard.connectWallet({
                autoSelect: {
                    label: previouslyConnectedWallets[0],
                    disableModals: true
                }
            });
            
            if (wallets.length > 0) {
                wallet = wallets[0];
                provider = wallet.provider;
                ethersProvider = new ethers.providers.Web3Provider(provider);
                signer = ethersProvider.getSigner();
                
                const accounts = await wallet.accounts;
                const chains = await wallet.chains;
                
                if (accounts.length > 0 && chains.length > 0) {
                    userAddress = accounts[0].address;
                    networkId = parseInt(chains[0].id, 10);
                    
                    updateWalletUI();
                    await updateBalances();
                    
                    console.log('Auto-connected to:', userAddress);
                    return true;
                }
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('Auto-connect failed:', error);
        return false;
    }
}

// 更新余额
async function updateBalances() {
    if (!ethersProvider || !userAddress) return;
    
    try {
        // 获取BNB余额
        const bnbBalance = await ethersProvider.getBalance(userAddress);
        const bnbFormatted = ethers.utils.formatEther(bnbBalance);
        const bnbDisplay = parseFloat(bnbFormatted).toFixed(4);
        
        document.getElementById('bnbBalance').textContent = `Balance: ${bnbDisplay} BNB`;
        
        // 获取代币余额（需要代币合约ABI）
        // 这里可以添加代币余额查询逻辑
        
        // 更新Max按钮的可用余额
        const maxBtn = document.getElementById('maxBtn');
        maxBtn.onclick = () => {
            document.getElementById('payAmount').value = bnbDisplay;
            calculateTokens();
        };
        
    } catch (error) {
        console.error('Failed to update balances:', error);
    }
}

// ===== 购买功能 =====
function initPurchase() {
    const payAmount = document.getElementById('payAmount');
    const receiveAmount = document.getElementById('receiveAmount');
    const priceValue = document.getElementById('priceValue');
    const buyBtn = document.getElementById('buyBtn');
    const maxBtn = document.getElementById('maxBtn');
    
    // 初始化价格显示
    updatePriceDisplay();
    
    // 计算接收的代币数量
    function calculateTokens() {
        const amount = parseFloat(payAmount.value);
        
        if (!amount || amount <= 0 || isNaN(amount)) {
            receiveAmount.value = '';
            buyBtn.disabled = true;
            return;
        }
        
        // 计算代币数量
        const tokens = amount * CONFIG.TOKENS_PER_BNB;
        receiveAmount.value = formatNumber(tokens, 0);
        
        // 如果钱包已连接，启用购买按钮
        if (userAddress) {
            buyBtn.disabled = false;
        }
    }
    
    // 购买代币
    async function purchaseTokens() {
        const amount = parseFloat(payAmount.value);
        
        // 验证输入
        if (!amount || amount <= 0) {
            showStatus('Please enter a valid BNB amount', 'error');
            return;
        }
        
        if (!userAddress) {
            showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        // 检查网络
        if (networkId !== 56) {
            showStatus('Please switch to BSC Mainnet to purchase', 'error');
            return;
        }
        
        try {
            // 显示交易状态
            showStatus('Processing transaction... Please confirm in your wallet.', 'pending');
            
            // 禁用按钮
            buyBtn.innerHTML = '<div class="loading"></div> Processing...';
            buyBtn.disabled = true;
            
            // 准备交易数据
            const transaction = {
                to: CONFIG.PRESALE_CONTRACT,
                value: ethers.utils.parseEther(amount.toString()),
                gasLimit: 300000
            };
            
            // 发送交易
            const tx = await signer.sendTransaction(transaction);
            
            // 等待交易确认
            showStatus('Transaction submitted. Waiting for confirmation...', 'pending');
            
            const receipt = await tx.wait();
            
            // 交易成功
            showStatus(`Purchase successful! Transaction hash: ${tx.hash}`, 'success');
            
            // 添加到交易历史
            addTransactionToHistory(amount, tx.hash);
            
            // 更新预售进度
            updatePresaleProgress(amount);
            
            // 重置输入
            payAmount.value = '';
            receiveAmount.value = '';
            
            // 更新余额
            await updateBalances();
            
        } catch (error) {
            console.error('Purchase failed:', error);
            
            let errorMessage = 'Transaction failed';
            if (error.code === 4001) {
                errorMessage = 'Transaction rejected by user';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient BNB balance';
            } else {
                errorMessage = error.message;
            }
            
            showStatus(errorMessage, 'error');
            
        } finally {
            // 恢复按钮状态
            buyBtn.innerHTML = '<i class="fas fa-bolt"></i><span>Buy STARBULL</span>';
            buyBtn.disabled = false;
        }
    }
    
    // 更新价格显示
    function updatePriceDisplay() {
        const formattedTokens = formatNumber(CONFIG.TOKENS_PER_BNB, 0);
        priceValue.textContent = `1 BNB = ${formattedTokens} STARBULL`;
    }
    
    // 更新预售进度
    function updatePresaleProgress(amount) {
        // 更新总筹集金额
        CONFIG.RAISED_AMOUNT += amount;
        
        // 更新进度显示
        const progressPercent = (CONFIG.RAISED_AMOUNT / CONFIG.STAGE_TARGET) * 100;
        const progressAmount = document.getElementById('progressAmount');
        const progressFill = document.getElementById('progressFill');
        const totalRaised = document.getElementById('totalRaised');
        
        progressAmount.textContent = `${CONFIG.RAISED_AMOUNT.toFixed(1)} / ${CONFIG.STAGE_TARGET} BNB`;
        progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
        totalRaised.textContent = `${CONFIG.RAISED_AMOUNT.toFixed(1)} BNB`;
    }
    
    // 绑定事件
    payAmount.addEventListener('input', calculateTokens);
    payAmount.addEventListener('change', calculateTokens);
    buyBtn.addEventListener('click', purchaseTokens);
    
    // Max按钮事件
    maxBtn.addEventListener('click', async () => {
        if (!ethersProvider || !userAddress) {
            showStatus('Please connect wallet first', 'error');
            return;
        }
        
        try {
            const balance = await ethersProvider.getBalance(userAddress);
            const bnbBalance = ethers.utils.formatEther(balance);
            
            // 保留少量BNB作为gas费
            const maxAmount = Math.max(0, parseFloat(bnbBalance) - 0.01);
            
            if (maxAmount > 0) {
                payAmount.value = maxAmount.toFixed(4);
                calculateTokens();
            } else {
                showStatus('Insufficient BNB balance', 'error');
            }
        } catch (error) {
            console.error('Failed to get balance:', error);
        }
    });
    
    // 初始计算
    calculateTokens();
}

// ===== 交易历史功能 =====
function initTransactionHistory() {
    // 模拟交易数据
    const mockTransactions = [
        { amount: 0.5, tokens: 308642, time: '2 min ago' },
        { amount: 1.2, tokens: 740740, time: '5 min ago' },
        { amount: 0.8, tokens: 493827, time: '12 min ago' },
        { amount: 2.1, tokens: 1296296, time: '25 min ago' },
        { amount: 0.3, tokens: 185185, time: '45 min ago' }
    ];
    
    const transactionList = document.getElementById('transactionList');
    
    // 添加模拟交易到列表
    mockTransactions.forEach(tx => {
        addTransactionToHistory(tx.amount, null, tx.tokens, tx.time);
    });
}

function addTransactionToHistory(amount, hash, tokens = null, time = null) {
    const transactionList = document.getElementById('transactionList');
    
    // 计算代币数量
    const tokenAmount = tokens || Math.floor(amount * CONFIG.TOKENS_PER_BNB);
    
    // 格式化时间
    const timeDisplay = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 创建交易项
    const transactionItem = document.createElement('div');
    transactionItem.className = 'transaction-item';
    transactionItem.innerHTML = `
        <span class="transaction-amount">${amount} BNB</span>
        <span class="transaction-tokens">${formatNumber(tokenAmount, 0)} STAR</span>
        <span class="transaction-time">${timeDisplay}</span>
    `;
    
    // 添加到列表顶部
    transactionList.insertBefore(transactionItem, transactionList.firstChild);
    
    // 限制列表长度
    if (transactionList.children.length > 5) {
        transactionList.removeChild(transactionList.lastChild);
    }
}

// ===== 倒计时功能 =====
function initCountdown() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    // 设置目标时间（5天后）
    countdownTarget = new Date();
    countdownTarget.setDate(countdownTarget.getDate() + 5);
    countdownTarget.setHours(12, 47, 22, 0);
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = countdownTarget.getTime() - now;
        
        if (distance < 0) {
            // 倒计时结束
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            
            // 触发阶段变化
            stageComplete();
            return;
        }
        
        // 计算时间
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // 更新显示
        daysEl.textContent = padZero(days);
        hoursEl.textContent = padZero(hours);
        minutesEl.textContent = padZero(minutes);
        secondsEl.textContent = padZero(seconds);
    }
    
    // 阶段完成
    function stageComplete() {
        console.log('Stage completed! Moving to next stage...');
        // 这里可以添加阶段切换逻辑
    }
    
    // 初始调用并设置定时器
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ===== 导航功能 =====
function initNavigation() {
    const header = document.getElementById('header');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const networkBtn = document.getElementById('networkBtn');
    
    // 滚动时更新导航
    function updateNavOnScroll() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // 高亮当前部分
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    // 移动端菜单切换
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.innerHTML = navMenu.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // 导航链接点击
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    // 关闭移动端菜单
                    navMenu.classList.remove('active');
                    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                    
                    // 滚动到目标
                    window.scrollTo({
                        top: targetSection.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // 钱包按钮事件
    connectWalletBtn.addEventListener('click', async () => {
        if (!userAddress) {
            await connectWallet();
        } else {
            await disconnectWallet();
        }
    });
    
    // 网络按钮事件
    networkBtn.addEventListener('click', async () => {
        if (userAddress) {
            await switchToBSC();
        } else {
            showStatus('Please connect wallet first', 'error');
        }
    });
    
    // 连接按钮事件
    document.getElementById('connectBtn').addEventListener('click', async () => {
        if (!userAddress) {
            await connectWallet();
        } else {
            await disconnectWallet();
        }
    });
    
    // 滚动监听
    window.addEventListener('scroll', updateNavOnScroll);
    updateNavOnScroll(); // 初始调用
}

// ===== 动画效果 =====
function initAnimations() {
    // 观察器配置
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    // 创建观察器
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    }, observerOptions);
    
    // 观察所有卡片元素
    document.querySelectorAll('.stat-card, .feature-card, .info-card').forEach(el => {
        observer.observe(el);
    });
}

// ===== 工具函数 =====
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('transactionStatus');
    
    // 清除现有状态
    statusDiv.className = 'transaction-status';
    
    // 设置新状态
    statusDiv.textContent = message;
    statusDiv.classList.add(type);
    statusDiv.classList.remove('d-none');
    
    // 自动隐藏
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusDiv.classList.add('d-none');
        }, 5000);
    }
}

function formatNumber(num, decimals = 2) {
    if (isNaN(num)) return '0';
    
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

// ===== 网络检查 =====
function checkNetworkSupport() {
    // 检查是否支持Web3
    if (typeof window.ethereum === 'undefined') {
        showStatus('Please install a Web3 wallet like MetaMask to use this dApp', 'error');
        return false;
    }
    return true;
}

// 初始网络检查
checkNetworkSupport();