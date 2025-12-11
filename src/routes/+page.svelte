<script lang="ts">
	import { Button } from '$shared/ui/button';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$shared/ui/card';
	import { Input } from '$shared/ui/input';
	import { Select } from '$shared/ui/select';

	let isLoading = $state(false);

	function simulateLoading() {
		isLoading = true;
		setTimeout(() => {
			isLoading = false;
		}, 2000);
	}
</script>

<svelte:head>
	<title>Dashboard Builder</title>
	<meta name="description" content="Dashboard builder demo" />
</svelte:head>

<div class="flex flex-col gap-8">
	<section>
		<h1 class="text-4xl font-semibold mb-2">Dashboard Builder</h1>
		<p class="text-muted-foreground">
			Button component adapted from shadcn-svelte with Carbon Design System
		</p>
	</section>

	<!-- Variants -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Button Variants</h2>
		<div class="flex flex-wrap gap-3">
			<Button variant="default">Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	</section>

	<!-- Sizes -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Button Sizes</h2>
		<div class="flex flex-wrap items-center gap-3">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon" title="Icon button">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M5 12h14" />
					<path d="M12 5v14" />
				</svg>
			</Button>
		</div>
	</section>

	<!-- States -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Button States</h2>
		<div class="flex flex-wrap gap-3">
			<Button disabled>Disabled</Button>
			<Button variant="secondary" disabled>Disabled Secondary</Button>
			<Button loading={isLoading} onclick={simulateLoading}>
				{isLoading ? 'Loading...' : 'Click to Load'}
			</Button>
		</div>
	</section>

	<!-- Examples -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Real-world Examples</h2>

		<div class="bg-card border border-card-border rounded-lg p-6">
			<h3 class="text-lg font-semibold mb-4">User Profile</h3>
			<div class="flex gap-3">
				<Button variant="default">Save Changes</Button>
				<Button variant="outline">Cancel</Button>
				<Button variant="destructive">Delete Account</Button>
			</div>
		</div>

		<div class="bg-card border border-card-border rounded-lg p-6">
			<h3 class="text-lg font-semibold mb-4">Dashboard Actions</h3>
			<div class="flex flex-wrap gap-3">
				<Button variant="default" size="sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M5 12h14" />
						<path d="M12 5v14" />
					</svg>
					Add Widget
				</Button>
				<Button variant="outline" size="sm">Export Data</Button>
				<Button variant="ghost" size="sm">Settings</Button>
			</div>
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Custom Styling</h2>
		<div class="flex flex-wrap gap-3">
			<Button variant="default" class="w-full">Full Width Button</Button>
			<Button variant="default" class="rounded-full">Rounded Full</Button>
			<Button variant="outline" class="border-2 border-primary">Custom Border</Button>
		</div>
	</section>

	<!-- Input Component -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Input Component</h2>

		<!-- Input Types -->
		<Card>
			<CardHeader>
				<CardTitle>Input Types</CardTitle>
				<CardDescription>Different input types with Carbon Design System styling</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4">
					<div>
						<label for="input-text" class="text-sm font-medium mb-2 block">Text Input</label>
						<Input id="input-text" type="text" placeholder="Enter your name" />
					</div>

					<div>
						<label for="input-email" class="text-sm font-medium mb-2 block">Email Input</label>
						<Input id="input-email" type="email" placeholder="email@example.com" />
					</div>

					<div>
						<label for="input-password" class="text-sm font-medium mb-2 block">Password Input</label>
						<Input id="input-password" type="password" placeholder="••••••••" />
					</div>

					<div>
						<label for="input-number" class="text-sm font-medium mb-2 block">Number Input</label>
						<Input id="input-number" type="number" placeholder="42" />
					</div>

					<div>
						<label for="input-disabled" class="text-sm font-medium mb-2 block">Disabled Input</label>
						<Input id="input-disabled" type="text" placeholder="Cannot edit" disabled />
					</div>

					<div>
						<label for="input-file" class="text-sm font-medium mb-2 block">File Input</label>
						<Input id="input-file" type="file" />
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Input with Validation -->
		<Card>
			<CardHeader>
				<CardTitle>Form Example</CardTitle>
				<CardDescription>Input fields with labels and helper text</CardDescription>
			</CardHeader>
			<CardContent>
				<form class="flex flex-col gap-4">
					<div>
						<label for="username" class="text-sm font-medium mb-2 block">Username</label>
						<Input id="username" type="text" placeholder="johndoe" required />
						<p class="text-sm text-muted-foreground mt-1">
							This will be your public display name.
						</p>
					</div>

					<div>
						<label for="user-email" class="text-sm font-medium mb-2 block">Email</label>
						<Input id="user-email" type="email" placeholder="john@example.com" required />
					</div>

					<div>
						<label for="bio" class="text-sm font-medium mb-2 block">Bio</label>
						<Input id="bio" type="text" placeholder="Tell us about yourself" />
						<p class="text-sm text-muted-foreground mt-1">Max 100 characters.</p>
					</div>

					<Button type="submit" class="w-full">Save Profile</Button>
				</form>
			</CardContent>
		</Card>

		<!-- Input Sizes -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<Card>
				<CardHeader>
					<CardTitle class="text-base">Default Size</CardTitle>
				</CardHeader>
				<CardContent>
					<Input placeholder="Default input (h-10)" />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="text-base">Custom Size</CardTitle>
				</CardHeader>
				<CardContent>
					<Input placeholder="Custom size" class="h-12 text-base" />
				</CardContent>
			</Card>
		</div>
	</section>

	<!-- Select Component -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Select Component</h2>

		<!-- Select Examples -->
		<Card>
			<CardHeader>
				<CardTitle>Select Examples</CardTitle>
				<CardDescription>Dropdown selections with Carbon Design System styling</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4">
					<div>
						<label for="select-country" class="text-sm font-medium mb-2 block">Country</label>
						<Select id="select-country">
							<option value="">Select a country</option>
							<option value="us">United States</option>
							<option value="uk">United Kingdom</option>
							<option value="ca">Canada</option>
							<option value="au">Australia</option>
							<option value="de">Germany</option>
						</Select>
					</div>

					<div>
						<label for="select-framework" class="text-sm font-medium mb-2 block">Framework</label>
						<Select id="select-framework">
							<option value="react">React</option>
							<option value="svelte" selected>SvelteKit</option>
							<option value="vue">Vue</option>
							<option value="angular">Angular</option>
							<option value="solid">Solid</option>
						</Select>
					</div>

					<div>
						<label for="select-disabled" class="text-sm font-medium mb-2 block"
							>Disabled Select</label
						>
						<Select id="select-disabled" disabled>
							<option>Cannot select</option>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Select with Form -->
		<Card>
			<CardHeader>
				<CardTitle>User Preferences</CardTitle>
				<CardDescription>Form with multiple select inputs</CardDescription>
			</CardHeader>
			<CardContent>
				<form class="flex flex-col gap-4">
					<div>
						<label for="language" class="text-sm font-medium mb-2 block">Language</label>
						<Select id="language" required>
							<option value="">Choose language</option>
							<option value="en">English</option>
							<option value="es">Spanish</option>
							<option value="fr">French</option>
							<option value="de">German</option>
							<option value="ja">Japanese</option>
						</Select>
					</div>

					<div>
						<label for="timezone" class="text-sm font-medium mb-2 block">Timezone</label>
						<Select id="timezone">
							<option value="utc">UTC</option>
							<option value="est">Eastern Time</option>
							<option value="cst">Central Time</option>
							<option value="mst">Mountain Time</option>
							<option value="pst" selected>Pacific Time</option>
						</Select>
					</div>

					<div>
						<label for="theme" class="text-sm font-medium mb-2 block">Theme</label>
						<Select id="theme">
							<option value="light">Light</option>
							<option value="dark">Dark</option>
							<option value="auto" selected>Auto</option>
						</Select>
					</div>

					<Button type="submit" class="w-full">Save Preferences</Button>
				</form>
			</CardContent>
		</Card>

		<!-- Select Sizes -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<Card>
				<CardHeader>
					<CardTitle class="text-base">Default Size</CardTitle>
				</CardHeader>
				<CardContent>
					<Select>
						<option>Default select (h-10)</option>
						<option>Option 2</option>
						<option>Option 3</option>
					</Select>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="text-base">Custom Size</CardTitle>
				</CardHeader>
				<CardContent>
					<Select class="h-12 text-base">
						<option>Custom size select</option>
						<option>Option 2</option>
						<option>Option 3</option>
					</Select>
				</CardContent>
			</Card>
		</div>
	</section>

	<!-- Card Component -->
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-semibold">Card Component</h2>

		<!-- Simple Card -->
		<Card>
			<CardHeader>
				<CardTitle>Simple Card</CardTitle>
				<CardDescription>A basic card with header and content</CardDescription>
			</CardHeader>
			<CardContent>
				<p>This is the card content. Cards are flexible containers for grouping related information.</p>
			</CardContent>
		</Card>

		<!-- Card with Footer -->
		<Card>
			<CardHeader>
				<CardTitle>Create New Project</CardTitle>
				<CardDescription>Deploy your new project in one-click.</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4">
					<div>
						<label for="project-name" class="text-sm font-medium">Project Name</label>
						<input
							id="project-name"
							type="text"
							placeholder="my-awesome-project"
							class="mt-2 w-full px-3 py-2 rounded-md border border-input focus:border-input-focus focus:ring-2 focus:ring-ring transition-colors"
						/>
					</div>
					<div>
						<label for="framework" class="text-sm font-medium">Framework</label>
						<select
							id="framework"
							class="mt-2 w-full px-3 py-2 rounded-md border border-input focus:border-input-focus focus:ring-2 focus:ring-ring transition-colors"
						>
							<option>Next.js</option>
							<option selected>SvelteKit</option>
							<option>Nuxt.js</option>
						</select>
					</div>
				</div>
			</CardContent>
			<CardFooter class="gap-3">
				<Button variant="default">Deploy</Button>
				<Button variant="outline">Cancel</Button>
			</CardFooter>
		</Card>

		<!-- Dashboard Cards Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<Card hover>
				<CardHeader>
					<CardTitle class="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-3xl font-bold">$45,231.89</div>
					<p class="text-sm text-success mt-2">+20.1% from last month</p>
				</CardContent>
			</Card>

			<Card hover>
				<CardHeader>
					<CardTitle class="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-3xl font-bold">2,350</div>
					<p class="text-sm text-success mt-2">+12.5% from last month</p>
				</CardContent>
			</Card>

			<Card hover>
				<CardHeader>
					<CardTitle class="text-sm font-medium text-muted-foreground">Sales</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="text-3xl font-bold">+573</div>
					<p class="text-sm text-success mt-2">+8.2% from last month</p>
				</CardContent>
			</Card>
		</div>
	</section>
</div>
