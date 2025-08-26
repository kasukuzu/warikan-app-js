document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const groupSection = document.getElementById('group-section');
    const mainApp = document.getElementById('main-app');
    const groupIdInput = document.getElementById('group-id-input');
    const joinGroupBtn = document.getElementById('join-group-btn');
    const currentGroupIdDisplay = document.getElementById('current-group-id-display');
    const setupSection = document.getElementById('setup-section');
    const expenseSection = document.getElementById('expense-section');
    const resultSection = document.getElementById('result-section');
    const participantNameInput = document.getElementById('participant-name');
    const addParticipantBtn = document.getElementById('add-participant-btn');
    const participantList = document.getElementById('participant-list');
    const startExpenseBtn = document.getElementById('start-expense-btn');
    const clearStorageBtn = document.getElementById('clear-storage-btn');
    const payerSelect = document.getElementById('payer-select');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseDescInput = document.getElementById('expense-desc');
    const expenseForRadio = document.getElementsByName('expense-for');
    const participantsCheckboxContainer = document.getElementById('participants-checkbox-container');
    const participantsCheckboxes = document.getElementById('participants-checkboxes');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expenseList = document.getElementById('expense-list');
    const backToSetupBtn = document.getElementById('back-to-setup-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const totalAmountSpan = document.getElementById('total-amount');
    const perPersonCostSpan = document.getElementById('per-person-cost');
    const transactionsListDiv = document.getElementById('transactions-list');
    const backToExpenseBtn = document.getElementById('back-to-expense-btn');
    const resetCalculationBtn = document.getElementById('reset-calculation-btn');

    // --- アプリのグローバル変数 ---
    let participants = [];
    let expenses = [];
    let settlements = [];
    let groupDocRef = null;
    let unsubscribe = null;

    // --- イベントリスナー ---
    joinGroupBtn.addEventListener('click', joinGroup);
    addParticipantBtn.addEventListener('click', addParticipant);
    startExpenseBtn.addEventListener('click', showExpenseSection);
    clearStorageBtn.addEventListener('click', clearAllData);
    addExpenseBtn.addEventListener('click', addExpense);
    calculateBtn.addEventListener('click', showResultSection);
    payerSelect.addEventListener('change', () => { createParticipantCheckboxes(); });
    backToSetupBtn.addEventListener('click', () => {
        expenseSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
    });
    backToExpenseBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        expenseSection.classList.remove('hidden');
    });
    resetCalculationBtn.addEventListener('click', resetCalculation);
    expenseForRadio.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'some') {
                participantsCheckboxContainer.classList.remove('hidden');
            } else {
                participantsCheckboxContainer.classList.add('hidden');
            }
        });
    });

    // --- 関数定義 ---
    function joinGroup() {
        const groupId = groupIdInput.value.trim();
        if (!groupId) {
            alert('グループIDを入力してください。');
            return;
        }
        groupDocRef = db.collection('groups').doc(groupId);
        currentGroupIdDisplay.textContent = `グループID: ${groupId}`;

        groupSection.classList.add('hidden');
        mainApp.classList.remove('hidden');

        if (unsubscribe) unsubscribe();
        
        unsubscribe = groupDocRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                participants = data.participants || [];
                expenses = data.expenses || [];
                settlements = data.settlements || [];
                renderUI();
            } else {
                groupDocRef.set({ participants: [], expenses: [], settlements: [] });
            }
        });
    }

    async function saveData() {
        if (!groupDocRef) return;
        try {
            await groupDocRef.set({ participants, expenses, settlements });
        } catch (error) {
            console.error("データの保存に失敗しました: ", error);
        }
    }

    async function clearAllData() {
        if (confirm('本当にこのグループの全データを消去しますか？参加している全員のデータが消えます。')) {
            participants = [];
            expenses = [];
            settlements = [];
            await saveData();
            alert('データを消去しました。');
        }
    }

    async function addParticipant() {
        const name = participantNameInput.value.trim();
        if (name && !participants.includes(name)) {
            participants.push(name);
            participantNameInput.value = '';
            await saveData();
        }
    }

    function showExpenseSection() {
        if (participants.length < 2) {
            alert('参加者を2人以上追加してください。');
            return;
        }
        setupSection.classList.add('hidden');
        expenseSection.classList.remove('hidden');
    }
    
    async function addExpense() {
        const payer = payerSelect.value;
        const amount = parseFloat(expenseAmountInput.value);
        const description = expenseDescInput.value.trim();
        const expenseFor = document.querySelector('input[name="expense-for"]:checked').value;
        let involvedParticipants = [];

        if (expenseFor === 'all') {
            involvedParticipants = [...participants];
        } else {
            document.querySelectorAll('#participants-checkboxes input:checked')
              .forEach(box => involvedParticipants.push(box.value));
            if (!involvedParticipants.includes(payer)) {
                involvedParticipants.push(payer);
            }
        }

        if (!payer || !(amount > 0) || !description) {
            alert('支払者、金額、内容を正しく入力してください。');
            return;
        }
        if (expenseFor === 'some' && involvedParticipants.length <= 1) {
            alert('対象者を自分以外に1人以上選択してください。');
            return;
        }

        expenses.push({ payer, amount, description, for: involvedParticipants });
        expenseAmountInput.value = '';
        expenseDescInput.value = '';
        await saveData();
    }

    function showResultSection() {
        if (expenses.length === 0) {
            alert('費用を1つ以上追加してください。');
            return;
        }
        expenseSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        calculateSplit();
    }
    
    async function resetCalculation() {
        if (confirm('現在の費用リストと完了した精算をすべて消去して、費用の入力からやり直しますか？\n（参加者リストは残ります）')) {
            expenses = [];
            settlements = [];
            await saveData();
            resultSection.classList.add('hidden');
            expenseSection.classList.remove('hidden');
        }
    }
    
    function renderUI() {
        updateParticipantList();
        updatePayerSelect();
        createParticipantCheckboxes();
        updateExpenseList();
        if (resultSection.classList.contains('hidden') === false) {
            calculateSplit();
        }
    }
    
    function updateParticipantList() {
        participantList.innerHTML = '';
        participants.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            participantList.appendChild(li);
        });
    }

    function updatePayerSelect() {
        payerSelect.innerHTML = '';
        participants.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            payerSelect.appendChild(option);
        });
    }
    
    function createParticipantCheckboxes() {
        participantsCheckboxes.innerHTML = '';
        const currentPayer = payerSelect.value;
        participants.forEach(name => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `check-${name}`;
            checkbox.value = name;
            const label = document.createElement('label');
            label.htmlFor = `check-${name}`;
            label.textContent = name;
            if (name === currentPayer) {
                checkbox.disabled = true;
                checkbox.checked = false;
                label.style.color = '#aaa';
            } else {
                checkbox.checked = true;
            }
            div.appendChild(checkbox);
            div.appendChild(label);
            participantsCheckboxes.appendChild(div);
        });
    }

    function updateExpenseList() {
        expenseList.innerHTML = '';
        expenses.forEach(expense => {
            const li = document.createElement('li');
            const target = expense.for.length === participants.length ? '全員' : expense.for.join(', ');
            li.textContent = `${expense.description}: ${expense.amount.toLocaleString()}円 (支払者: ${expense.payer}, 対象: ${target})`;
            expenseList.appendChild(li);
        });
    }

    async function completeTransaction(from, to, amount) {
        if (confirm(`${from}さんから${to}さんへの${amount.toLocaleString()}円の支払いを完了しますか？`)) {
            settlements.push({ from, to, amount });
            await saveData();
        }
    }
    
    function calculateSplit() {
        // Step 1: 誰が誰にいくら借りているかのマトリックスを作成
        const debts = {};
        participants.forEach(p1 => {
            debts[p1] = {};
            participants.forEach(p2 => {
                if (p1 !== p2) debts[p1][p2] = 0;
            });
        });

        // Step 2: 各費用ごとに、支払者への借りを計算
        expenses.forEach(expense => {
            const payer = expense.payer;
            const amount = expense.amount;
            const involved = expense.for;
            const numInvolved = involved.length;
            if (numInvolved === 0) return;

            const individualCosts = {};
            const baseCost = Math.floor(amount / numInvolved);
            involved.forEach(p => { individualCosts[p] = baseCost; });
            const remainder = amount % numInvolved;
            const shuffledInvolved = [...involved].sort(() => 0.5 - Math.random());
            for (let i = 0; i < remainder; i++) {
                individualCosts[shuffledInvolved[i]] += 1;
            }

            involved.forEach(beneficiary => {
                if (beneficiary !== payer) {
                    debts[beneficiary][payer] += individualCosts[beneficiary];
                }
            });
        });

        // Step 3: 完了した精算を反映させる
        settlements.forEach(s => {
            if(debts[s.from] && typeof debts[s.from][s.to] !== 'undefined') {
                debts[s.from][s.to] -= s.amount;
            }
        });

        // Step 4: 逆方向の貸し借りを相殺する
        const participantsCopy = [...participants];
        for (let i = 0; i < participantsCopy.length; i++) {
            for (let j = i + 1; j < participantsCopy.length; j++) {
                const p1 = participantsCopy[i];
                const p2 = participantsCopy[j];
                
                const debt1to2 = debts[p1][p2] || 0;
                const debt2to1 = debts[p2][p1] || 0;

                if (debt1to2 > debt2to1) {
                    debts[p1][p2] = debt1to2 - debt2to1;
                    debts[p2][p1] = 0;
                } else {
                    debts[p2][p1] = debt2to1 - debt1to2;
                    debts[p1][p2] = 0;
                }
            }
        }

        // Step 5: 最終的な精算リストを作成
        const transactions = [];
        for (const debtor in debts) {
            for (const creditor in debts[debtor]) {
                const amount = Math.round(debts[debtor][creditor]);
                if (amount > 0) {
                    transactions.push({ from: debtor, to: creditor, amount: amount });
                }
            }
        }

        // --- 結果表示 ---
        const overallTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const overallPerPerson = participants.length > 0 ? overallTotal / participants.length : 0;
        
        totalAmountSpan.textContent = overallTotal.toLocaleString();
        perPersonCostSpan.textContent = `約 ${Math.round(overallPerPerson).toLocaleString()}`;
        
        transactionsListDiv.innerHTML = '';
        if (transactions.length === 0) {
            const p = document.createElement('p');
            p.textContent = '精算の必要はありません。';
            transactionsListDiv.appendChild(p);
        } else {
            transactions.forEach(t => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'transaction-item';
                const p = document.createElement('p');
                p.textContent = `› ${t.from}さん → ${t.to}さん へ ${t.amount.toLocaleString()}円 支払う`;
                const completeBtn = document.createElement('button');
                completeBtn.className = 'btn-complete';
                completeBtn.textContent = '完了';
                completeBtn.onclick = () => completeTransaction(t.from, t.to, t.amount);
                itemDiv.appendChild(p);
                itemDiv.appendChild(completeBtn);
                transactionsListDiv.appendChild(itemDiv);
            });
        }
    }
});