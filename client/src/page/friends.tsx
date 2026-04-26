import i18next from "i18next";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import Modal from "react-modal";
import { SearchableSelect } from "@rin/ui";
import { ShowAlertType, useAlert, useConfirm } from "../components/dialog";
import { Input } from "../components/input";
import { Waiting } from "../components/loading";
import { client } from "../app/runtime";
import { ClientConfigContext } from "../state/config";
import { ProfileContext } from "../state/profile";
import { useSiteConfig } from "../hooks/useSiteConfig";

type FriendItem = {
    name: string;
    id: number;
    uid: number;
    avatar: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    desc: string | null;
    url: string;
    accepted: number;
    health: string;
    sort_order?: number;
};

async function publish({
    name,
    avatar,
    desc,
    url,
    showAlert,
}: {
    name: string;
    avatar: string;
    desc: string;
    url: string;
    showAlert: ShowAlertType;
}) {
    const t = i18next.t;
    const { error } = await client.friend.create({
        avatar,
        name,
        desc,
        url,
    });
    if (error) {
        showAlert(error.value as string);
    } else {
        showAlert(t("create.success"), () => {
            window.location.reload();
        });
    }
}

export function FriendsPage() {
    const { t } = useTranslation();
    const siteConfig = useSiteConfig();
    const config = useContext(ClientConfigContext);
    const [apply] = useState<FriendItem>();
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [avatar, setAvatar] = useState("");
    const [url, setUrl] = useState("");
    const profile = useContext(ProfileContext);
    const [friendsAvailable, setFriendsAvailable] = useState<FriendItem[]>([]);
    const [waitList, setWaitList] = useState<FriendItem[]>([]);
    const [refusedList, setRefusedList] = useState<FriendItem[]>([]);
    const [friendsUnavailable, setFriendsUnavailable] = useState<FriendItem[]>([]);
    const [status, setStatus] = useState<"idle" | "loading">("loading");
    const ref = useRef(false);
    const { showAlert, AlertUI } = useAlert();

    useEffect(() => {
        if (ref.current) return;
        client.friend.list().then(({ data }) => {
            if (data) {
                const friendList = data.friend_list || [];
                setFriendsAvailable(friendList.filter(({ health, accepted }: any) => health.length === 0 && accepted === 1) as any);
                setFriendsUnavailable(friendList.filter(({ health, accepted }: any) => health.length > 0 && accepted === 1) as any);
                setWaitList(friendList.filter(({ accepted }: any) => accepted === 0) as any);
                setRefusedList(friendList.filter(({ accepted }: any) => accepted === -1) as any);
            }
            setStatus("idle");
        });
        ref.current = true;
    }, []);

    function publishButton() {
        publish({ name, desc, avatar, url, showAlert });
    }

    const totalCount = friendsAvailable.length + friendsUnavailable.length + waitList.length + refusedList.length;

    return (
        <>
            <Helmet>
                <title>{`${t("friends.title")} - ${siteConfig.name}`}</title>
                <meta property="og:site_name" content={siteConfig.name} />
                <meta property="og:title" content={t("friends.title")} />
                <meta property="og:image" content={siteConfig.avatar} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={document.URL} />
            </Helmet>
            <Waiting for={friendsAvailable.length !== 0 || friendsUnavailable.length !== 0 || status === "idle"}>
                <main className="wauto ani-show pb-14 pt-6 t-primary md:pt-8">
                    <section className="border-b border-black/8 pb-5 dark:border-white/10">
                        <div>
                            <p className="site-kicker">{t("friends.title")}</p>
                            <h1 className="site-display mt-2 text-[1.55rem] font-semibold text-neutral-900 dark:text-white md:text-[2rem]">
                                {t("friends.title")}
                            </h1>
                            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">
                                Neighbors, adjacent blogs, and the outward links that make the site feel alive.
                            </p>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                <FriendStat label={t("friends.title")} value={friendsAvailable.length} />
                                <FriendStat label={t("friends.left")} value={friendsUnavailable.length} />
                                <FriendStat label={t("status")} value={totalCount} />
                            </div>
                        </div>
                    </section>

                    <section className="mt-6 space-y-7 md:mt-8">
                        <FriendList title={t("friends.title")} show={friendsAvailable.length > 0} friends={friendsAvailable} />
                        <FriendList title={t("friends.left")} show={friendsUnavailable.length > 0} friends={friendsUnavailable} />
                        <FriendList title={t("friends.review.waiting")} show={waitList.length > 0} friends={waitList} />
                        <FriendList title={t("friends.review.rejected")} show={refusedList.length > 0} friends={refusedList} />
                        <FriendList title={t("friends.my_apply")} show={profile?.permission !== true && apply !== undefined} friends={apply ? [apply] : []} />
                    </section>

                    {profile && (profile.permission || config.get("friend_apply_enable")) ? (
                        <section className="mt-8">
                            <div className="site-panel rounded-[10px] px-4 py-5 md:px-6">
                                <p className="site-kicker">{profile.permission ? t("friends.create") : t("friends.apply")}</p>
                                <h2 className="site-display mt-2 text-[1.35rem] font-semibold text-neutral-900 dark:text-white md:text-[1.6rem]">
                                    {profile.permission ? t("friends.create") : t("friends.apply")}
                                </h2>
                                <div className="mt-6 grid gap-3 md:grid-cols-2">
                                    <Input value={name} setValue={setName} placeholder={t("sitename")} variant="flat" />
                                    <Input value={url} setValue={setUrl} placeholder={t("url")} variant="flat" />
                                    <Input value={desc} setValue={setDesc} placeholder={t("description")} variant="flat" className="md:col-span-2" />
                                    <Input value={avatar} setValue={setAvatar} placeholder={t("avatar.url")} variant="flat" className="md:col-span-2" />
                                </div>
                                <div className="mt-5 flex justify-end">
                                    <button onClick={publishButton} className="rounded-[8px] bg-theme px-5 py-3 text-sm font-medium text-white">
                                        {t("create.title")}
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : null}
                </main>
            </Waiting>
            <AlertUI />
        </>
    );
}

function FriendList({ title, show, friends }: { title: string; show: boolean; friends: FriendItem[] }) {
    if (!show) return null;

    return (
        <section>
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <p className="site-kicker">{title}</p>
                    <h2 className="site-display mt-2 text-[1.25rem] font-semibold text-neutral-900 dark:text-white">{friends.length}</h2>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {friends.map((friend) => (
                    <Friend key={friend.id} friend={friend} />
                ))}
            </div>
        </section>
    );
}

function Friend({ friend }: { friend: FriendItem }) {
    const { t } = useTranslation();
    const profile = useContext(ProfileContext);
    const [avatar, setAvatar] = useState(friend.avatar);
    const [name, setName] = useState(friend.name);
    const [desc, setDesc] = useState(friend.desc || "");
    const [url, setUrl] = useState(friend.url);
    const [status, setStatus] = useState(friend.accepted);
    const [sortOrder, setSortOrder] = useState(friend.sort_order || 0);
    const [modalIsOpen, setIsOpen] = useState(false);
    const { showConfirm, ConfirmUI } = useConfirm();
    const { showAlert, AlertUI } = useAlert();

    const deleteFriend = useCallback(() => {
        showConfirm(t("delete.title"), t("delete.confirm"), () => {
            client.friend.delete(friend.id).then(({ error }) => {
                if (error) {
                    showAlert(error.value as string);
                } else {
                    showAlert(t("delete.success"), () => {
                        window.location.reload();
                    });
                }
            });
        });
    }, [friend.id, showAlert, showConfirm, t]);

    const updateFriend = useCallback(() => {
        client.friend
            .update(friend.id, {
                avatar,
                name,
                desc,
                url,
                accepted: status,
                sort_order: sortOrder,
            })
            .then(({ error }) => {
                if (error) {
                    showAlert(error.value as string);
                } else {
                    showAlert(t("update.success"), () => {
                        window.location.reload();
                    });
                }
            });
    }, [avatar, desc, friend.id, name, showAlert, sortOrder, status, t, url]);

    const statusOption = [
        { value: -1, label: t("friends.review.rejected") },
        { value: 0, label: t("friends.review.waiting") },
        { value: 1, label: t("friends.review.accepted") },
    ];

    return (
        <>
            <a
                title={friend.name}
                href={friend.url}
                target="_blank"
                className="site-panel group relative flex min-h-[170px] flex-col rounded-[10px] px-4 py-4 transition hover:border-theme/30 md:px-5 md:py-5"
            >
                <div className="flex items-start justify-between gap-3">
                    <img
                        className={`h-11 w-11 rounded-[8px] object-cover ${friend.health.length > 0 ? "grayscale" : ""}`}
                        src={friend.avatar}
                        alt={friend.name}
                    />
                    {(profile?.permission || profile?.id === friend.uid) ? (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setIsOpen(true);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-black/10 bg-white/55 text-neutral-500 transition hover:border-theme/30 hover:bg-theme/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:hover:bg-theme/15"
                        >
                            <i className="ri-settings-line" />
                        </button>
                    ) : null}
                </div>
                <p className="mt-4 text-base font-semibold text-neutral-900 dark:text-white md:text-lg">{friend.name}</p>
                {friend.health.length === 0 ? (
                    <p className="mt-2 text-[14px] leading-6 text-neutral-600 dark:text-neutral-300">{friend.desc}</p>
                ) : (
                    <p className="mt-2 text-[14px] leading-6 text-neutral-500 dark:text-neutral-400">{errorHumanize(friend.health)}</p>
                )}
                {friend.accepted !== 1 ? (
                    <p className={`mt-4 text-[12px] font-medium uppercase tracking-[0.18em] ${friend.accepted === 0 ? "text-neutral-500 dark:text-neutral-300" : "text-theme"}`}>
                        {statusOption[friend.accepted + 1].label}
                    </p>
                ) : null}
            </a>

            <Modal
                isOpen={modalIsOpen}
                style={{
                    content: {
                        top: "50%",
                        left: "50%",
                        right: "auto",
                        bottom: "auto",
                        marginRight: "-50%",
                        transform: "translate(-50%, -50%)",
                        padding: "0",
                        border: "none",
                        borderRadius: "24px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "transparent",
                        width: "min(640px, 92vw)",
                    },
                    overlay: {
                        backgroundColor: "rgba(0, 0, 0, 0.55)",
                        zIndex: 1000,
                    },
                }}
                onRequestClose={() => setIsOpen(false)}
                contentLabel={t("update$sth", { sth: friend.name })}
            >
                <div className="site-panel w-full rounded-[10px] p-5">
                    <div className="flex items-center gap-4">
                        <img className={`h-14 w-14 rounded-[8px] object-cover ${friend.health.length > 0 ? "grayscale" : ""}`} src={friend.avatar} alt={friend.name} />
                        <div>
                            <p className="site-kicker">{t("friends.title")}</p>
                            <h3 className="site-display mt-2 text-[1.5rem] font-semibold text-neutral-900 dark:text-white">{friend.name}</h3>
                        </div>
                    </div>

                    {profile?.permission ? (
                        <div className="mt-6 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[8px] border border-black/10 bg-white/50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                                <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{t("status")}</p>
                                <SearchableSelect
                                    value={String(status)}
                                    onChange={(nextValue) => {
                                        const parsed = Number(nextValue);
                                        if (!Number.isNaN(parsed)) {
                                            setStatus(parsed);
                                        }
                                    }}
                                    options={statusOption.map((option) => ({
                                        label: option.label,
                                        value: String(option.value),
                                    }))}
                                    placeholder={t("status")}
                                    searchPlaceholder={t("status")}
                                />
                            </div>
                            <div className="rounded-[8px] border border-black/10 bg-white/50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                                <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{t("sort_order")}</p>
                                <Input value={sortOrder.toString()} setValue={(val) => setSortOrder(parseInt(val, 10) || 0)} placeholder={t("sort_order")} variant="flat" />
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-6 grid gap-3">
                        <Input value={name} setValue={setName} placeholder={t("sitename")} variant="flat" />
                        <Input value={desc} setValue={setDesc} placeholder={t("description")} variant="flat" />
                        <Input value={avatar} setValue={setAvatar} placeholder={t("avatar.url")} variant="flat" />
                        <Input value={url} setValue={setUrl} placeholder={t("url")} variant="flat" />
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={deleteFriend} className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                            {t("delete.title")}
                        </button>
                        <button onClick={updateFriend} className="rounded-[8px] bg-theme px-4 py-2 text-sm font-medium text-white">
                            {t("save")}
                        </button>
                    </div>
                </div>
            </Modal>
            <ConfirmUI />
            <AlertUI />
        </>
    );
}

function FriendStat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-[8px] border border-black/10 bg-white/35 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="mt-2 text-base font-semibold text-neutral-900 dark:text-white">{value}</p>
        </div>
    );
}

function errorHumanize(error: string) {
    if (error === "certificate has expired" || error === "526") {
        return "证书已过期";
    }
    if (error.includes("Unable to connect") || error === "521" || error === "522") {
        return "无法访问";
    }
    return error;
}
