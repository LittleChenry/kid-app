import { Link } from 'react-router-dom';

const apps = [
  {
    to: '/tv',
    title: '电视台',
    desc: '看动画、学知识',
    color: 'from-kid-blue to-blue-400',
    emoji: '📺',
  },
  {
    to: '/calligraphy',
    title: '字帖',
    desc: '练写字、学书法',
    color: 'from-kid-orange to-orange-400',
    emoji: '✍️',
  },
  {
    to: '/arithmetic',
    title: '算数',
    desc: '做算术、练思维',
    color: 'from-kid-green to-green-400',
    emoji: '🔢',
  },
];

export default function Home() {
  return (
    <div className="page-container">
      <div className="text-center pt-8 pb-6">
        <h1 className="font-display text-4xl md:text-5xl text-kid-blue mb-2">
          宝贝乐园
        </h1>
        <p className="text-gray-500 text-lg">选择一个小应用开始吧</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {apps.map((app) => (
          <Link
            key={app.to}
            to={app.to}
            className="kid-card group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}
            >
              {app.emoji}
            </div>
            <h2 className="font-display text-2xl font-bold mb-1">{app.title}</h2>
            <p className="text-gray-500">{app.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
