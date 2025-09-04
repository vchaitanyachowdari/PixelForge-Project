import { useState, useEffect } from 'react';
import { Wallet, Plus, TrendingUp, Clock } from 'lucide-react';
import { WalletTransaction } from '@/shared/types';

interface WalletManagerProps {
  walletBalance: number;
  onBalanceUpdate: () => void;
}

export default function WalletManager({ walletBalance, onBalanceUpdate }: WalletManagerProps) {
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/wallet/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        setShowTopup(false);
        setTopupAmount('500');
        onBalanceUpdate();
        fetchTransactions();
      }
    } catch (error) {
      console.error('Failed to top up wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'deduct':
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      case 'bonus':
        return <Plus className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'topup':
      case 'bonus':
        return 'text-green-600';
      case 'deduct':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Wallet</h2>
            <p className="text-sm text-gray-500">Manage your credits</p>
          </div>
        </div>
        <button
          onClick={() => setShowTopup(true)}
          className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Funds</span>
        </button>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Current Balance</p>
          <p className="text-3xl font-bold text-gray-900">₹{walletBalance.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">
            {Math.floor(walletBalance / 25)} credits available
          </p>
        </div>
      </div>

      {transactions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                    {transaction.type === 'deduct' ? '-' : '+'}₹{Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  {transaction.creditsAdded > 0 && (
                    <p className="text-xs text-gray-500">
                      +{transaction.creditsAdded} credits
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top-up Modal */}
      {showTopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add Funds</h3>
              <button
                onClick={() => setShowTopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="100"
                  step="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll get {Math.floor(parseFloat(topupAmount || '0') / 25)} credits
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['500', '1000', '2500'].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTopupAmount(amount)}
                    className={`p-3 rounded-lg border text-sm font-medium ${
                      topupAmount === amount
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTopup(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopup}
                  disabled={loading || !topupAmount || parseFloat(topupAmount) <= 0}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {loading ? 'Processing...' : 'Add Funds'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
