import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

function YoutubeDashboard() {
  const [channelName, setChannelName] = useState('');
  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChannelData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setChannelData(null);

    try {
      const response = await fetch(`https://social-media-dashboard-fullstack.onrender.com/api/channel/${channelName}`);
      
      if (!response.ok) {
        throw new Error('Channel not found or error in fetching data.');
      }
      
      const data = await response.json();
      setChannelData(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCharts = () => {
    if (!channelData || !channelData.recentVideos) return null;

    // Prepare data for charts
    const videoLabels = channelData.recentVideos.map((_, index) => `Video ${index + 1}`);
    const videoTitles = channelData.recentVideos.map(video => video.title);
    const likes = channelData.recentVideos.map(video => video.likes);
    const comments = channelData.recentVideos.map(video => video.comments);

    // Common chart options
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            title: function(context) {
              return videoTitles[context[0].dataIndex];
            }
          }
        }
      }
    };

    // Bar chart data
    const likesBarData = {
      labels: videoLabels,
      datasets: [
        {
          label: 'Likes',
          data: likes,
          backgroundColor: '#0d94d2',
          borderColor: '#0a7bb0',
          borderWidth: 1
        }
      ]
    };

    const commentsBarData = {
      labels: videoLabels,
      datasets: [
        {
          label: 'Comments',
          data: comments,
          backgroundColor: '#f39c12',
          borderColor: '#d8850a',
          borderWidth: 1
        }
      ]
    };

    // Line chart data for engagement comparison
    const engagementComparisonData = {
      labels: videoLabels,
      datasets: [
        {
          label: 'Likes',
          data: likes,
          borderColor: '#0d94d2',
          backgroundColor: 'rgba(13, 148, 210, 0.2)',
          tension: 0.3
        },
        {
          label: 'Comments',
          data: comments,
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243, 156, 18, 0.2)',
          tension: 0.3
        }
      ]
    };

    // Pie chart data
    const colors = [
      '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'
    ];

    const likesPieData = {
      labels: videoLabels.slice(0, 5),
      datasets: [
        {
          data: likes.slice(0, 5),
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace(')', ', 0.8)')),
          borderWidth: 1
        }
      ]
    };

    const commentsPieData = {
      labels: videoLabels.slice(0, 5),
      datasets: [
        {
          data: comments.slice(0, 5),
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace(')', ', 0.8)')),
          borderWidth: 1
        }
      ]
    };

    // Pie chart options
    const pieOptions = {
      ...chartOptions,
      cutout: '40%',
      plugins: {
        ...chartOptions.plugins,
        legend: {
          position: 'right'
        }
      }
    };

    return (
      <div className="space-y-8">
        {/* Likes Bar Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Recent Videos Likes</h3>
          <div className="h-96">
            <Bar data={likesBarData} options={chartOptions} />
          </div>
        </div>

        {/* Comments Bar Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Recent Videos Comments</h3>
          <div className="h-96">
            <Bar data={commentsBarData} options={chartOptions} />
          </div>
        </div>
        
        {/* Engagement Comparison Line Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Engagement Comparison</h3>
          <div className="h-96">
            <Line data={engagementComparisonData} options={chartOptions} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Likes Distribution Pie Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">Likes Distribution of Top 5 Videos</h3>
            <div className="h-72">
              <Pie data={likesPieData} options={pieOptions} />
            </div>
          </div>

          {/* Comments Distribution Pie Chart */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">Comments Distribution of Top 5 Videos</h3>
            <div className="h-72">
              <Pie data={commentsPieData} options={pieOptions} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-blue-600 mb-8 text-center">YouTube Dashboard</h1>
      
      <form onSubmit={fetchChannelData} className="mb-10 flex justify-center">
        <div className="flex space-x-2 items-center w-full max-w-lg">
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Enter Channel Name"
            className="flex-grow px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md transition duration-200"
            required
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md"
          >
            Search
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex flex-col justify-center items-center space-y-4 mt-8 animate-fadeIn">
          <div className="w-16 h-16 border-4 border-t-4 border-blue-600 rounded-full animate-spin"></div>
          <span className="text-xl font-semibold text-blue-600">Fetching channel data...</span>
        </div>
      )}

      {error && <div className="text-center text-red-600 font-semibold mt-8">{error}</div>}

      {channelData && (
        <div className="space-y-10 animate-fadeIn">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center transition transform hover:scale-105">
            <img src={channelData.stats.channelThumbnail} alt="Channel thumbnail" className="w-32 h-32 rounded-full mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-blue-600">{channelData.stats.channelName}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition duration-200">
              <h3 className="text-lg font-semibold mb-2">Subscribers</h3>
              <p className="text-3xl font-bold text-blue-600">{channelData.stats.totalSubscribers}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition duration-200">
              <h3 className="text-lg font-semibold mb-2">Total Views</h3>
              <p className="text-3xl font-bold text-blue-600">{channelData.stats.totalViews}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition duration-200">
              <h3 className="text-lg font-semibold mb-2">Total Videos</h3>
              <p className="text-3xl font-bold text-blue-600">{channelData.stats.totalVideos}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-6">Recent Videos</h3>
            <div className="space-y-6">
              {channelData.recentVideos.map((video, index) => (
                <div key={index} className="border-b pb-6 space-y-3 text-gray-800">
                  <h4 className="font-semibold text-lg">{video.title}</h4>
                  <p className="text-sm text-gray-600">Published on: {new Date(video.publishedAt).toLocaleDateString()}</p>
                  <div className="flex flex-col space-y-1 text-gray-700 font-medium">
                    <p className="text-lg">Views: <span className="font-bold text-gray-900">{video.views}</span></p>
                    <p className="text-lg">Likes: <span className="font-bold text-gray-900">{video.likes}</span></p>
                    <p className="text-lg">Comments: <span className="font-bold text-gray-900">{video.comments}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {renderCharts()}
        </div>
      )}
    </div>
  );
}

export default YoutubeDashboard;
