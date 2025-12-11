import React, { useState } from 'react';
import { useAuthStore } from '../lib/store/authStore';
import { slugify } from '../lib/utils/formatters';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('');
  const { signup, isLoading, error } = useAuthStore();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Auto-generate slug from email username if slug is empty
    if (!slug) {
      const username = newEmail.split('@')[0];
      setSlug(slugify(username));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(email, password, slug);
      window.location.href = '/app/dashboard';
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={handleEmailChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="vous@exemple.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Mot de passe <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="••••••••"
        />
        <p className="mt-1 text-sm text-gray-500">Minimum 8 caractères</p>
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
          URL de votre site <span className="text-red-500">*</span>
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
            asap.cool/
          </span>
          <input
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
            pattern="[a-z0-9-]+"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="mon-site"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Utilisez uniquement des lettres minuscules, chiffres et tirets
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Création...' : 'Créer mon compte'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Déjà un compte?{' '}
        <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Se connecter
        </a>
      </p>
    </form>
  );
}
