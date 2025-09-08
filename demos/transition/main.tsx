import ReactDOM from 'react-dom/client';
import { useState, useTransition } from 'react';
// import { useState } from 'react';
function App() {
	const [tab, setTab] = useState('about');
	console.log(tab);
	const [isPending, startTransition] = useTransition();
	function selectTab(nextTab) {
		startTransition(() => {
			setTab(nextTab);
		});
	}
	return (
		<>
			<div style={{ display: 'flex', gap: '8px' }}>
				<TabButton
					isActive={tab === 'about'}
					onClick={() => selectTab('about')}
				>
					Index
				</TabButton>
				<TabButton isActive={tab === 'post'} onClick={() => selectTab('post')}>
					Post
				</TabButton>
				<TabButton
					isActive={tab === 'contact'}
					onClick={() => selectTab('contact')}
				>
					Contact
				</TabButton>
			</div>
			<hr />
			<div>
				{tab === 'about' && <About />}
				{tab === 'post' && <Posts />}
				{tab === 'contact' && <Contact />}
			</div>
		</>
	);
}
function TabButton(props) {
	const { isActive, onClick } = props;
	return isActive ? (
		<strong>{props.children}</strong>
	) : (
		<button onClick={onClick}>{props.children}</button>
	);
}
function About() {
	return <div>About Myself</div>;
}
function Posts() {
	const [num] = useState(100);
	return (
		<ul>
			{new Array(num).fill(0).map((_, i) => {
				return <Item key={i}>{i}</Item>;
			})}
		</ul>
	);
}
function Item({ children }) {
	const now = performance.now();
	while (performance.now() - now < 4) {
		// 阻塞渲染
	}
	return <li>{children}</li>;
}
function Contact() {
	return (
		<ul>
			<li>联系我：xxx</li>
		</ul>
	);
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
