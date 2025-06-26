import React from 'react';
import { Link } from 'react-router-dom';
import { FaYoutube } from 'react-icons/fa';
import { TbLetterX } from 'react-icons/tb';

function Analysis() {
  return (
    <div className="space-y-12 p-8 max-w-7xl mx-auto">
      <h1 className="text-5xl font-bold text-blue-600 text-center mb-8 animate__animated animate__fadeIn">Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* X Analysis Card */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 ease-in-out">
          <div className="text-6xl text-blue-500 mb-4 flex justify-center animate__animated animate__fadeIn">
            <TbLetterX />
          </div>
          <h2 className="text-3xl font-semibold text-blue-600 mb-4">X (formerly Twitter) Analysis</h2>
          <p className="text-gray-700 mb-6 leading-relaxed text-lg">
            Gain insights into recent posts, perform sentiment analysis, and track engagement trends to understand audience reactions and follower growth.
          </p>
          <Link
            to="/twitter-engagement"
            className="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition-colors duration-300 inline-block text-lg font-medium transform hover:scale-105 ease-in-out"
          >
            Explore X
          </Link>
        </div>

        {/* YouTube Report Card */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 ease-in-out">
          <div className="text-6xl text-red-500 mb-4 flex justify-center animate__animated animate__fadeIn">
            <FaYoutube />
          </div>
          <h2 className="text-3xl font-semibold text-red-600 mb-4">YouTube Report</h2>
          <p className="text-gray-700 mb-6 leading-relaxed text-lg">
            View data on your latest videos, including metrics on views, likes, and comments. Perfect for analyzing content performance.
          </p>
          <Link
            to="/youtube-dashboard"
            className="bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-colors duration-300 inline-block text-lg font-medium transform hover:scale-105 ease-in-out"
          >
            Explore YouTube
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Analysis;
