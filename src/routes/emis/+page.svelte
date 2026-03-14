<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
</script>

<svelte:head>
	<title>EMIS Foundation</title>
	<meta
		name="description"
		content="Starting point for the EMIS foundation inside the current SvelteKit application."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="space-y-2">
			<div class="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">EMIS</div>
			<h1 class="text-3xl font-semibold tracking-tight">EMIS Foundation</h1>
			<p class="max-w-3xl text-sm text-muted-foreground">
				Это стартовая точка EMIS внутри текущего приложения. На этом этапе уже добавлены отдельная
				схема БД <span class="font-mono">emis</span>, migrations/seeds runner, health endpoint и
				документы по реализации.
			</p>
		</header>

		<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<Card>
				<CardHeader>
					<CardTitle>DB Foundation</CardTitle>
					<CardDescription>Миграции и демо seed-данные</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p><span class="font-mono">pnpm db:status</span> - посмотреть состояние миграций</p>
					<p><span class="font-mono">pnpm db:migrate</span> - применить схему EMIS</p>
					<p><span class="font-mono">pnpm db:seed</span> - загрузить demo-данные</p>
					<p><span class="font-mono">pnpm db:reset</span> - пересобрать EMIS schema с нуля</p>
					<p>Для этих команд нужна PostgreSQL-инстанция с доступным расширением PostGIS.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>API Namespace</CardTitle>
					<CardDescription>Первый серверный entry point</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>
						Health endpoint: <a class="underline underline-offset-4" href="/api/emis/health"
							>/api/emis/health</a
						>
					</p>
					<p>Дальше сюда будут добавляться CRUD, search и map endpoints.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Git Cadence</CardTitle>
					<CardDescription>Как двигаем EMIS дальше</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 text-sm text-muted-foreground">
					<p>После каждого завершенного этапа сохраняем локальный git commit.</p>
					<p>
						Ближайший следующий этап: repositories/services и первые
						<span class="font-mono">/api/emis/*</span> endpoints.
					</p>
				</CardContent>
			</Card>
		</section>

		<Card>
			<CardHeader>
				<CardTitle>Ближайшие шаги</CardTitle>
				<CardDescription>Очередность реализации уже зафиксирована в spec</CardDescription>
			</CardHeader>
			<CardContent class="grid gap-3 md:grid-cols-2">
				<div class="rounded-lg border border-border/60 bg-muted/20 p-4">
					<div class="text-sm font-medium">1. Server write layer</div>
					<p class="mt-2 text-sm text-muted-foreground">
						Repositories, services, Zod validation, objects/news/links CRUD.
					</p>
				</div>
				<div class="rounded-lg border border-border/60 bg-muted/20 p-4">
					<div class="text-sm font-medium">2. Server query layer</div>
					<p class="mt-2 text-sm text-muted-foreground">
						List queries, detail queries, map queries и DTO mappers.
					</p>
				</div>
				<div class="rounded-lg border border-border/60 bg-muted/20 p-4">
					<div class="text-sm font-medium">3. Workspace `/emis`</div>
					<p class="mt-2 text-sm text-muted-foreground">
						Карта, результаты, фильтры и переходы в карточки.
					</p>
				</div>
				<div class="rounded-lg border border-border/60 bg-muted/20 p-4">
					<div class="text-sm font-medium">4. BI wiring</div>
					<p class="mt-2 text-sm text-muted-foreground">
						Подключение views EMIS к текущему BI/BFF контуру.
					</p>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
